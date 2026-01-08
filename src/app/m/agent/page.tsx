'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function MobileAgentPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'מצטער, אירעה שגיאה. נסה שוב.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'מצטער, אירעה שגיאה. נסה שוב.' }])
    }

    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-132px)]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <Bot size={48} className="mb-4 text-[#1e3a5f]/30" />
            <p className="text-lg font-medium mb-2">שלום! אני WDI Agent</p>
            <p className="text-sm">אני יכול לעזור לך עם מידע על עובדים, פרויקטים, אירועים ועוד.</p>
            <div className="mt-6 space-y-2 text-sm">
              <p className="text-gray-400">נסה לשאול:</p>
              <button
                onClick={() => setInput('כמה פרויקטים פעילים יש לנו?')}
                className="block w-full bg-gray-100 rounded-lg px-4 py-2 text-right hover:bg-gray-200"
              >
                כמה פרויקטים פעילים יש לנו?
              </button>
              <button
                onClick={() => setInput('מי עובד בפרויקט מגדל?')}
                className="block w-full bg-gray-100 rounded-lg px-4 py-2 text-right hover:bg-gray-200"
              >
                מי עובד בפרויקט מגדל?
              </button>
              <button
                onClick={() => setInput('תראה לי את האירועים האחרונים')}
                className="block w-full bg-gray-100 rounded-lg px-4 py-2 text-right hover:bg-gray-200"
              >
                תראה לי את האירועים האחרונים
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-[#1e3a5f] text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-[#1e3a5f] text-white rounded-tr-none'
                    : 'bg-white border border-gray-200 rounded-tl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="שאל אותי משהו..."
            className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[#1e3a5f] text-white rounded-full p-2.5 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  )
}