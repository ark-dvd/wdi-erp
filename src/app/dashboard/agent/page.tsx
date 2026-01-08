'use client';

// ================================================
// WDI ERP - WDI Agent Page
// Version: 20251211-143400
// Fixes: #16 header color from palette, text change
// ================================================

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'מצטער, אירעה שגיאה. אנא נסה שוב.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exampleQuestions = [
    'כמה עובדים פעילים יש בחברה?',
    'מה הפרויקטים הפעילים?',
    'מתי יום ההולדת הקרוב?',
    'מי מנהלי הפרויקטים?',
    'מה האירועים האחרונים?',
    'תן לי סטטיסטיקות על הפרויקטים',
  ];

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* #16: Header - צבעים מהפלטה המאושרת */}
      <div className="bg-[#0a3161] text-white p-4 rounded-t-lg">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          WDI Agent
        </h1>
        {/* #16: טקסט מעודכן */}
        <p className="text-white/80 text-sm mt-1">
          שאל אותי כל שאלה על המידע שקיים במערכת
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              שלום! אני WDI Agent
            </h2>
            <p className="text-gray-500 mb-6">
              אני יכול לעזור לך למצוא מידע במערכת. נסה לשאול:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {exampleQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-[#0a3161]/10 hover:border-[#0a3161]/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-[#0a3161] text-white rounded-tr-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
              }`}
            >
              {message.role === 'user' ? (
                <div className="whitespace-pre-wrap">{message.content}</div>
              ) : (
                <div className="markdown-content prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-3">
                          <table className="w-full border-collapse text-sm">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-[#0a3161]/10 border-b-2 border-[#0a3161]/20">
                          {children}
                        </thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-gray-200">
                          {children}
                        </tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="hover:bg-gray-50">
                          {children}
                        </tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-3 py-2 text-right font-semibold text-[#0a3161] bg-[#0a3161]/10">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-3 py-2 text-right border-b border-gray-100">
                          {children}
                        </td>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 my-2 mr-2">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1 my-2 mr-2">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-gray-700">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-bold text-gray-800">{children}</strong>
                      ),
                      p: ({ children }) => (
                        <p className="my-2 leading-relaxed">{children}</p>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold text-gray-800 my-3">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-bold text-gray-800 my-2">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-bold text-gray-800 my-2">{children}</h3>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-white/60' : 'text-gray-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString('he-IL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-end">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#0a3161] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-[#0a3161] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-[#0a3161] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-gray-500 text-sm">מעבד...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="הקלד שאלה..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0a3161] focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-[#0a3161] text-white rounded-full p-3 hover:bg-[#0a3161]/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}