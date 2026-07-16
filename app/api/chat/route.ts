import { GoogleGenAI } from '@google/genai'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

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

  try {
    const body = await request.json()
    message = body.message
    conversationId = body.conversationId

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response('Message is required', { status: 400 })
    }
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  let currentConversationId = conversationId

  try {
    if (!currentConversationId) {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: message.slice(0, 50) })
        .select()
        .single()

      if (convError || !newConversation) {
        return new Response('Failed to create conversation', { status: 500 })
      }

      currentConversationId = newConversation.id
    }

    await supabase.from('messages').insert({
      conversation_id: currentConversationId,
      role: 'user',
      content: message,
    })
  } catch {
    return new Response('Database error', { status: 500 })
  }

  let response
  try {
    response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: message,
    })
  } catch {
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