'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: number
  content: string
  isUser: boolean
  timestamp: Date
}

interface ChatHistory {
  id: string
  title: string
  messages: Message[]
  timestamp: Date
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load chat history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('chatHistory')
    if (saved) {
      const parsed = JSON.parse(saved)
      setChatHistory(parsed.map((chat: any) => ({
        ...chat,
        timestamp: new Date(chat.timestamp),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      })))
    }
  }, [])

  // Save current chat to history when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const chatTitle = messages.find(m => m.isUser)?.content.substring(0, 50) || 'New Chat'
      const chatId = currentChatId || Date.now().toString()
      
      if (!currentChatId) {
        setCurrentChatId(chatId)
      }

      const updatedHistory = chatHistory.filter(chat => chat.id !== chatId)
      const newChat: ChatHistory = {
        id: chatId,
        title: chatTitle,
        messages: messages,
        timestamp: new Date()
      }
      
      const newHistory = [newChat, ...updatedHistory].slice(0, 20) // Keep only 20 recent chats
      setChatHistory(newHistory)
      localStorage.setItem('chatHistory', JSON.stringify(newHistory))
    }
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [inputMessage])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
    }

    const currentMessages = [...messages, userMessage]
    setMessages(currentMessages)
    setInputMessage('')
    setIsLoading(true)

    try {
      // Convert message history to API format
      const history = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: inputMessage,
          history: history
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const aiMessage: Message = {
          id: Date.now() + 1,
          content: data.response,
          isUser: false,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        content: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const newChat = () => {
    setMessages([])
    setInputMessage('')
    setCurrentChatId(null)
  }

  const loadChat = (chat: ChatHistory) => {
    setMessages(chat.messages)
    setCurrentChatId(chat.id)
  }

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = chatHistory.filter(chat => chat.id !== chatId)
    setChatHistory(updated)
    localStorage.setItem('chatHistory', JSON.stringify(updated))
    if (currentChatId === chatId) {
      newChat()
    }
  }

  return (
    <div className="flex w-full h-full relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'w-64' : 'w-0'
      } bg-[#171717] border-r border-gray-700 transition-all duration-300 overflow-hidden flex flex-col fixed md:relative h-full z-50 md:z-auto`}>
        <div className="p-3">
          <button
            onClick={newChat}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-600 hover:bg-[#2A2A2A] transition-colors text-white text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs text-gray-400 px-3 mb-2">Recent</div>
          {chatHistory.map((chat) => (
            <div
              key={chat.id}
              className={`w-full px-3 py-2 rounded-lg mb-1 hover:bg-[#2A2A2A] transition-colors group flex items-center justify-between cursor-pointer ${
                currentChatId === chat.id ? 'bg-[#2A2A2A]' : ''
              }`}
              onClick={() => loadChat(chat)}
            >
              <div className="flex-1 overflow-hidden">
                <div className="text-white text-sm truncate">{chat.title}</div>
                <div className="text-gray-500 text-xs">
                  {new Date(chat.timestamp).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={(e) => deleteChat(chat.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
              >
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center gap-3 px-3 py-2 text-white text-sm">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-semibold">
              U
            </div>
            <span>User</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="bg-[#212121] p-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg text-gray-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-white font-semibold text-lg">VisionAi</h1>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center px-4">
                <h2 className="text-2xl md:text-4xl font-semibold text-white mb-6 md:mb-8">How can I help you today?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  <button className="p-4 bg-[#2A2A2A] hover:bg-[#343434] rounded-xl text-left transition-colors">
                    <div className="text-white text-sm">Create a travel itinerary</div>
                    <div className="text-gray-400 text-xs mt-1">for a city of my choice</div>
                  </button>
                  <button className="p-4 bg-[#2A2A2A] hover:bg-[#343434] rounded-xl text-left transition-colors">
                    <div className="text-white text-sm">Explain a complex topic</div>
                    <div className="text-gray-400 text-xs mt-1">in simple terms</div>
                  </button>
                  <button className="p-4 bg-[#2A2A2A] hover:bg-[#343434] rounded-xl text-left transition-colors">
                    <div className="text-white text-sm">Help me debug code</div>
                    <div className="text-gray-400 text-xs mt-1">or write new functions</div>
                  </button>
                  <button className="p-4 bg-[#2A2A2A] hover:bg-[#343434] rounded-xl text-left transition-colors">
                    <div className="text-white text-sm">Brainstorm ideas</div>
                    <div className="text-gray-400 text-xs mt-1">for any project</div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 md:py-6">
              {messages.map((message) => (
                <div key={message.id} className={`mb-6 flex gap-4 ${message.isUser ? 'justify-end' : ''}`}>
                  {!message.isUser && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">VI</span>
                    </div>
                  )}
                  <div className={`flex-1 ${message.isUser ? 'max-w-[80%]' : ''}`}>
                    <div className={`${
                      message.isUser
                        ? 'bg-[#2A2A2A] text-white rounded-2xl px-4 py-3'
                        : 'text-white prose prose-invert max-w-none'
                    }`}>
                      {message.isUser ? (
                        <p className="whitespace-pre-wrap text-sm md:text-[15px] leading-relaxed">{message.content}</p>
                      ) : (
                        <div className="text-sm md:text-[15px] leading-relaxed">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-base font-bold mt-2 mb-1" {...props} />,
                              p: ({node, ...props}) => <p className="mb-2" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                              li: ({node, ...props}) => <li className="ml-2" {...props} />,
                              code: ({node, inline, ...props}: any) => 
                                inline ? (
                                  <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm" {...props} />
                                ) : (
                                  <code className="block bg-gray-800 p-3 rounded-lg my-2 overflow-x-auto text-sm" {...props} />
                                ),
                              pre: ({node, ...props}) => <pre className="my-2" {...props} />,
                              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-600 pl-4 italic my-2" {...props} />,
                              a: ({node, ...props}) => <a className="text-blue-400 hover:underline" {...props} />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                  {message.isUser && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-semibold">U</span>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="mb-6 flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <span className="text-white text-xs font-bold">VI</span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Container */}
        <div className="bg-[#212121] p-3 sm:p-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#2A2A2A] rounded-3xl border border-gray-600 flex items-end gap-2 p-2 focus-within:border-gray-500 transition-colors">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message VisionAi"
                className="flex-1 bg-transparent text-white px-3 py-2 focus:outline-none resize-none max-h-[200px] text-[15px]"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0 mb-1"
              >
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">VisionAi can make mistakes. Check important info.</p>
          </div>
        </div>
      </div>
    </div>
  )
}