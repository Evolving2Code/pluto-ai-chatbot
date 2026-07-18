'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

useEffect(() => {
  loadConversations()
}, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations() {
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      }
    } catch {
      // Sidebar failing to load isn't critical
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
        setSidebarOpen(false)
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
    setSidebarOpen(false)
  }
  async function copyMessage(content: string, index: number) {
  try {
    await navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  } catch {
    setError('Failed to copy message.')
  }
  }
  function stopGeneration() {
  abortControllerRef.current?.abort()
  }

  function handleTouchStart(id: string) {
    longPressTimer.current = setTimeout(() => {
      setMenuOpenFor(id)
    }, 500)
  }

  function handleTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function startRename(conv: Conversation) {
    setRenamingId(conv.id)
    setRenameValue(conv.title)
    setMenuOpenFor(null)
  }

  async function submitRename(id: string) {
    if (!renameValue.trim()) {
      setRenamingId(null)
      return
    }
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue.trim() }),
      })
      if (response.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: renameValue.trim() } : c))
        )
      } else {
        setError('Failed to rename conversation.')
      }
    } catch {
      setError('Failed to rename conversation.')
    } finally {
      setRenamingId(null)
    }
  }

  async function deleteConversation(id: string) {
    setMenuOpenFor(null)
    try {
      const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        if (conversationId === id) {
          startNewConversation()
        }
      } else {
        setError('Failed to delete conversation.')
      }
    } catch {
      setError('Failed to delete conversation.')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  if (!input.trim() || loading) return

  const userMessage: Message = { role: 'user', content: input }
  setMessages((prev) => [...prev, userMessage])
  setInput('')

  await sendToGemini(userMessage.content)
}

async function regenerateLast() {
  if (loading) return
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
  if (!lastUserMessage) return

  await sendToGemini(lastUserMessage.content, true, true)
}

async function sendToGemini(
  messageContent: string,
  isRegenerate = false,
  removeLastAssistant = false
) {
  setError('')
  setLoading(true)

  const assistantMessage: Message = { role: 'assistant', content: '' }

  if (removeLastAssistant) {
    setMessages((prev) => {
      const lastAssistantIndex = prev.map((m) => m.role).lastIndexOf('assistant')
      const trimmed =
        lastAssistantIndex === -1 ? prev : prev.slice(0, lastAssistantIndex)
      return [...trimmed, assistantMessage]
    })
  } else {
    setMessages((prev) => [...prev, assistantMessage])
  }

  const isNewConversation = conversationIdRef.current === null

  const controller = new AbortController()
  abortControllerRef.current = controller

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageContent,
        conversationId: conversationIdRef.current,
        isRegenerate,
      }),
      signal: controller.signal,
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
    let idExtracted = false

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
  console.log('Messages after chunk:', JSON.stringify(updated.map(m => ({ role: m.role, len: m.content.length })), null, 2))
  return updated
})
    }

    if (isNewConversation) {
      loadConversations()
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      // User intentionally stopped generation
    } else {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      )
      setMessages((prev) => prev.slice(0, -1))
    }
  } finally {
    setLoading(false)
    abortControllerRef.current = null
  }
}

  return (
    <div className="flex h-dvh relative">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 flex flex-col transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <h2 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Conversations</h2>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">No conversations yet</p>
          )}
          {conversations.map((conv) => (
            <div key={conv.id} className="relative group">
              {renamingId === conv.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => submitRename(conv.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename(conv.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  className="w-full text-sm p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              ) : (
                <button
                  onClick={() => loadConversation(conv.id)}
                  onTouchStart={() => handleTouchStart(conv.id)}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  className={`w-full text-left text-sm p-2 pr-8 rounded truncate ${
                    conv.id === conversationId
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {conv.title}
                </button>
              )}

              {renamingId !== conv.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpenFor(menuOpenFor === conv.id ? null : conv.id)
                  }}
                  className="hidden md:group-hover:block absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  aria-label="Conversation options"
                >
                  ⋮
                </button>
              )}

            </div>
          ))}
        </div>

        <button
          onClick={startNewConversation}
          className="mt-4 bg-black text-white dark:bg-white dark:text-black rounded p-2 text-sm"
        >
          + New conversation
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open conversations menu"
            className="p-1 text-gray-700 dark:text-gray-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Pluto</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-gray-400 dark:text-gray-500 text-center mt-8">
              No messages yet — start the conversation below
            </p>
          )}
          {messages.map((msg, i) => (
  <div
    key={i}
    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
  >
    <div
      className={`max-w-[85%] md:max-w-md rounded p-2 px-3 ${
        msg.role === 'user'
          ? 'bg-black text-white dark:bg-white dark:text-black'
          : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
      }`}
    >
      {msg.role === 'assistant' ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              code(props) {
                const { children, className, ...rest } = props
                const match = /language-(\w+)/.exec(className || '')
                return match ? (
                  <SyntaxHighlighter
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style={oneDark as any}
                    language={match[1]}
                    PreTag="div"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...rest}>
                    {children}
                  </code>
                )
              },
            }}
          >
            {msg.content || (loading && i === messages.length - 1 ? '...' : '')}
          </ReactMarkdown>
        </div>
      ) : (
        msg.content
      )}
    </div>
    {msg.role === 'assistant' && msg.content && (
  <div className="flex gap-2 mt-1">
    <button
      onClick={() => copyMessage(msg.content, i)}
      className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-1"
    >
      {copiedIndex === i ? 'Copied!' : 'Copy'}
    </button>
    {i === messages.length - 1 && (
      <button
        onClick={regenerateLast}
        disabled={loading}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-1 disabled:opacity-50"
      >
        Regenerate
      </button>
    )}
  </div>
)}
  </div>
))}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Chat with Pluto... (Shift+Enter to send)"
            rows={1}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
            disabled={loading}
          />
          {loading ? (
  <button
    type="button"
    onClick={stopGeneration}
    className="bg-red-600 text-white rounded px-4"
  >
    Stop
  </button>
) : (
  <button
    type="submit"
    className="bg-black text-white dark:bg-white dark:text-black rounded px-4 disabled:opacity-50"
  >
    Send
  </button>
)}
        </form>
      </main>

      {menuOpenFor && (
        <div
          onClick={() => setMenuOpenFor(null)}
          className="fixed inset-0 z-50 bg-black/30 flex items-end md:items-center justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-t-lg md:rounded-lg shadow-lg w-full md:w-64 overflow-hidden"
          >
            <button
              onClick={() => {
                const conv = conversations.find((c) => c.id === menuOpenFor)
                if (conv) startRename(conv)
              }}
              className="w-full text-left text-base md:text-sm px-4 py-3 md:py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700"
            >
              Rename
            </button>
            <button
              onClick={() => {
                if (menuOpenFor) deleteConversation(menuOpenFor)
              }}
              className="w-full text-left text-base md:text-sm px-4 py-3 md:py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}