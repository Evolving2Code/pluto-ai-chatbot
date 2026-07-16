'use client'

import { useState, useEffect, useRef } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Conversation = {
  id: string
  title: string
  created_at: string
}

export default function Chat() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const conversationIdRef = useRef<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      }
    } catch {
      // Sidebar failing to load isn't critical — fail silently, chat still works
    }
  }

  async function loadConversation(id: string) {
  try {
    const response = await fetch(`/api/conversations/${id}/messages`)
    if (response.ok) {
      const data = await response.json()
      setMessages(data)
      setConversationId(id)
      conversationIdRef.current = id
      setError('')
    }
  } catch {
    setError('Failed to load conversation. Please try again.')
  }
  }

  function startNewConversation() {
  setMessages([])
  setConversationId(null)
  conversationIdRef.current = null
  setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    setError('')
    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages((prev) => [...prev, assistantMessage])

    const isNewConversation = conversationIdRef.current === null

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, conversationId: conversationIdRef.current }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Something went wrong')
      }

      if (!response.body) {
        throw new Error('No response received')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let idExtracted = conversationIdRef.current !== null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        let chunk = decoder.decode(value)

        if (!idExtracted) {
          buffer += chunk
          const match = buffer.match(/^__CONVERSATION_ID__(.+?)__END__/)
          if (match) {
  setConversationId(match[1])
  conversationIdRef.current = match[1]
  idExtracted = true
  chunk = buffer.slice(match[0].length)
  buffer = ''
          }
          else {
            continue
          }
        }

        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }

      if (isNewConversation) {
        loadConversations()
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      )
      // Remove the empty assistant placeholder bubble on failure
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 flex flex-col">
        <h2 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Conversations</h2>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">No conversations yet</p>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full text-left text-sm p-2 rounded truncate ${
                conv.id === conversationId
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {conv.title}
            </button>
          ))}
        </div>
        <button
          onClick={startNewConversation}
          className="mt-4 bg-black text-white dark:bg-white dark:text-black rounded p-2 text-sm"
        >
          + New conversation
        </button>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-gray-400 dark:text-gray-500 text-center mt-8">
              No messages yet — start the conversation below
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md rounded p-2 px-3 ${
                  msg.role === 'user'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                }`}
              >
                {msg.content || (loading && i === messages.length - 1 ? '...' : '')}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            disabled={loading}
          />
          <button
            type="submit"
            className="bg-black text-white dark:bg-white dark:text-black rounded px-4 disabled:opacity-50"
            disabled={loading}
          >
            Send
          </button>
        </form>
      </main>
    </div>
  )
}