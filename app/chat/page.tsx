'use client'

import { useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function Chat() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages((prev) => [...prev, assistantMessage])

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage.content, conversationId }),
    })

    if (!response.body) {
      setLoading(false)
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let idExtracted = conversationId !== null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      let chunk = decoder.decode(value)

      if (!idExtracted) {
        buffer += chunk
        const match = buffer.match(/^__CONVERSATION_ID__(.+?)__END__/)
        if (match) {
          setConversationId(match[1])
          idExtracted = true
          chunk = buffer.slice(match[0].length)
          buffer = ''
        } else {
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

    setLoading(false)
  }

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 flex flex-col">
        <h2 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Conversations</h2>
        <div className="flex-1 overflow-y-auto">
          <p className="text-sm text-gray-400 dark:text-gray-500">No conversations yet</p>
        </div>
        <button
          onClick={() => {
            setMessages([])
            setConversationId(null)
          }}
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