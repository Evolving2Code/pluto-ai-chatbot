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

  const { message, conversationId } = await request.json()

  let currentConversationId = conversationId

  // Create a new conversation if one doesn't exist yet
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

  // Save the user's message
  await supabase.from('messages').insert({
    conversation_id: currentConversationId,
    role: 'user',
    content: message,
  })

  const response = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: message,
  })

  const encoder = new TextEncoder()
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      // Send the conversation ID first so the client knows it
      controller.enqueue(encoder.encode(`__CONVERSATION_ID__${currentConversationId}__END__`))

      for await (const chunk of response) {
        const text = chunk.text
        if (text) {
          fullResponse += text
          controller.enqueue(encoder.encode(text))
        }
      }

      // Save the assistant's full reply once streaming finishes
      await supabase.from('messages').insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: fullResponse,
      })

      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}