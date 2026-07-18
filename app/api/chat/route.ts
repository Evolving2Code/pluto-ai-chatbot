import { GoogleGenAI } from '@google/genai'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

function generateTitle(message: string): string {
  return message.slice(0, 50)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  let message: string
  let conversationId: string | null
  let isRegenerate: boolean

  try {
    const body = await request.json()
    message = body.message
    conversationId = body.conversationId
    isRegenerate = Boolean(body.isRegenerate)

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response('Message is required', { status: 400 })
    }
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  let currentConversationId = conversationId

  try {
    if (!currentConversationId) {
      const title = generateTitle(message)

      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title })
        .select()
        .single()

      if (convError || !newConversation) {
        return new Response('Failed to create conversation', { status: 500 })
      }

      currentConversationId = newConversation.id
    }

    if (!isRegenerate) {
  await supabase.from('messages').insert({
    conversation_id: currentConversationId,
    role: 'user',
    content: message,
  })
    }
  } catch {
    return new Response('Database error', { status: 500 })
  }

  let history: { id: string; role: string; content: string }[] = []
try {
  const { data: pastMessages, error: historyError } = await supabase
  .from('messages')
  .select('id, role, content')
  .eq('conversation_id', currentConversationId)
  .order('created_at', { ascending: true })
  if (historyError) {
    return new Response('Failed to load conversation history', { status: 500 })
  }

  history = pastMessages || []
} catch {
  return new Response('Database error', { status: 500 })
}

// On regenerate, drop the most recent assistant message from history
// (it's the stale reply we're replacing) so Gemini sees the user's
// question as the latest turn needing a response
if (isRegenerate && history.length > 0 && history[history.length - 1].role === 'assistant') {
  const staleAssistantId = history[history.length - 1].id
  history = history.slice(0, -1)
  await supabase.from('messages').delete().eq('id', staleAssistantId)
}

const contents = history.map((msg) => ({
  role: msg.role === 'assistant' ? 'model' : 'user',
  parts: [{ text: msg.content }],
}))

  let response
  try {
    response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents,
    })
  } catch (err) {
    console.error('Gemini generateContentStream error:', err)
    return new Response('Gemini API error — please try again', { status: 502 })
  }

  const encoder = new TextEncoder()
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`__CONVERSATION_ID__${currentConversationId}__END__`))

        for await (const chunk of response) {
  const text = chunk.text
  if (text) {
    fullResponse += text
    controller.enqueue(encoder.encode(text))
  }
        }

        if (fullResponse) {
          await supabase.from('messages').insert({
            conversation_id: currentConversationId,
            role: 'assistant',
            content: fullResponse,
          })
        }
      } catch {
        controller.enqueue(encoder.encode('\n\n[Error: response was interrupted]'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}