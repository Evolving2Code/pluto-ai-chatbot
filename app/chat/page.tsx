'use client'

import { useState } from 'react'

export default function Chat() {
  const [input, setInput] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Wiring up Gemini comes in Card 6 — this just clears the input for now
    setInput('')
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50 p-4 flex flex-col">
        <h2 className="font-semibold mb-4">Conversations</h2>
        <div className="flex-1 overflow-y-auto">
          <p className="text-sm text-gray-400">No conversations yet</p>
        </div>
        <button className="mt-4 bg-black text-white rounded p-2 text-sm">
          + New conversation
        </button>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-gray-400 text-center mt-8">
            No messages yet — start the conversation below
          </p>
        </div>

        {/* Input box */}
        <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded p-2"
          />
          <button
            type="submit"
            className="bg-black text-white rounded px-4"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  )
}
