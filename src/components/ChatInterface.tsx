'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: number
  content: string
  isUser: boolean
  timestamp: Date
  imageUrl?: string
  type?: 'text' | 'image'
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
  const [mode, setMode] = useState<'chat' | 'image'>('chat')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const handleLiveSendRef = useRef<((transcript: string) => void) | null>(null)
  const audioQueueRef = useRef<Array<{ text: string; audio: HTMLAudioElement }>>([])
  const isPlayingAudioRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

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

    // Initialize speech synthesis
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis

      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = ''
          let interimTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          if (finalTranscript && finalTranscript.trim()) {
            setInputMessage(finalTranscript)
            
            // Check if we're in live mode and trigger send
            setTimeout(() => {
              const liveModeActive = (window as any).isLiveModeActive
              if (liveModeActive && handleLiveSendRef.current) {
                handleLiveSendRef.current(finalTranscript)
              }
            }, 100)
            
            if (!(window as any).isLiveModeActive) {
              setIsListening(false)
            }
          } else if (interimTranscript) {
            setInputMessage(interimTranscript)
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          setIsListening(false)
          
          // Provide user-friendly error messages
          if (event.error === 'no-speech') {
            // Don't show error for no-speech, just stop listening silently
            return
          } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            console.warn('Microphone access denied')
            alert('Microphone access denied. Please allow microphone access in your browser settings.')
          } else if (event.error === 'network') {
            console.warn('Network error during speech recognition')
            alert('Network error. Please check your internet connection.')
          } else if (event.error !== 'aborted') {
            console.warn('Speech recognition error:', event.error)
            alert(`Speech recognition error: ${event.error}`)
          }
        }

        recognitionRef.current.onend = () => {
          const liveModeActive = (window as any).isLiveModeActive
          setIsListening(false)
          
          // In live mode, restart listening after a short delay
          if (liveModeActive && !(window as any).isAISpeaking) {
            setTimeout(() => {
              if ((window as any).isLiveModeActive && recognitionRef.current) {
                try {
                  recognitionRef.current.start()
                  setIsListening(true)
                } catch (error) {
                  console.warn('Could not restart recognition:', error)
                }
              }
            }, 1000)
          }
        }
      }
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

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming) {
      scrollToBottom()
    }
  }, [isStreaming, messages])

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
      type: mode === 'image' ? 'image' : 'text'
    }

    const currentMessages = [...messages, userMessage]
    setMessages(currentMessages)
    setInputMessage('')
    setIsLoading(true)

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      if (mode === 'image') {
        // Generate image
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt: inputMessage
          }),
          signal: abortControllerRef.current.signal
        })

        const data = await response.json()

        if (response.ok) {
          const aiMessage: Message = {
            id: Date.now() + 1,
            content: `Generated image for: "${inputMessage}"`,
            isUser: false,
            timestamp: new Date(),
            imageUrl: data.imageUrl,
            type: 'image'
          }
          setMessages(prev => [...prev, aiMessage])
        } else {
          console.error('Image generation error:', data)
          throw new Error(data.error || data.message || 'Failed to generate image')
        }
      } else {
        // Chat mode with streaming
        const history = messages.filter(msg => msg.type !== 'image').map(msg => ({
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
            history: history,
            stream: true
          }),
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || 'Failed to get response')
        }

        // Check if response is streaming or regular JSON
        const contentType = response.headers.get('content-type')
        const isStreaming = contentType?.includes('text/event-stream')

        if (isStreaming && response.body) {
          // Handle streaming response
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let accumulatedText = ''
          let sentenceBuffer = ''
          
          const aiMessageId = Date.now() + 1
          setIsStreaming(true)

          // Add initial empty AI message
          const aiMessage: Message = {
            id: aiMessageId,
            content: '',
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          }
          setMessages(prev => [...prev, aiMessage])

          try {
            while (true) {
              const { done, value } = await reader.read()
              
              if (done) {
                // Process any remaining sentence
                if (sentenceBuffer.trim()) {
                  await synthesizeSentence(sentenceBuffer.trim())
                }
                setIsStreaming(false)
                break
              }

              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const jsonStr = line.slice(6)
                    const data = JSON.parse(jsonStr)
                    
                    if (data.done) {
                      continue
                    }

                    if (data.content) {
                      accumulatedText += data.content
                      sentenceBuffer += data.content

                      // Update the AI message with accumulated text
                      setMessages(prev => 
                        prev.map(msg => 
                          msg.id === aiMessageId 
                            ? { ...msg, content: accumulatedText }
                            : msg
                        )
                      )

                      // Check if we have a complete sentence or phrase
                      // More aggressive pattern: sentence end OR comma with space OR after 10+ words
                      const sentenceEndMatch = sentenceBuffer.match(/[.!?]\s|,\s(?=\w{4,})/)
                      const wordCount = sentenceBuffer.split(/\s+/).length
                      
                      if (sentenceEndMatch || wordCount >= 10) {
                        let completeSentence = ''
                        
                        if (sentenceEndMatch) {
                          const endIndex = sentenceBuffer.indexOf(sentenceEndMatch[0]) + sentenceEndMatch[0].length
                          completeSentence = sentenceBuffer.substring(0, endIndex).trim()
                          sentenceBuffer = sentenceBuffer.substring(endIndex)
                        } else if (wordCount >= 15) {
                          // Split at last space to avoid cutting words
                          const lastSpaceIndex = sentenceBuffer.lastIndexOf(' ')
                          if (lastSpaceIndex > 0) {
                            completeSentence = sentenceBuffer.substring(0, lastSpaceIndex).trim()
                            sentenceBuffer = sentenceBuffer.substring(lastSpaceIndex + 1)
                          }
                        }

                        // Synthesize the complete sentence/phrase immediately
                        if (completeSentence && completeSentence.length > 3) {
                          synthesizeSentence(completeSentence) // Don't await - fire and forget for speed
                        }
                      }
                    }
                  } catch (e) {
                    console.warn('Failed to parse SSE data:', e)
                  }
                }
              }
            }
          } catch (error: any) {
            if (error.name !== 'AbortError') {
              console.error('Streaming error:', error)
              throw error
            }
          }
        } else {
          // Handle non-streaming JSON response (fallback)
          const data = await response.json()
          
          if (data.response) {
            const aiMessage: Message = {
              id: Date.now() + 1,
              content: data.response,
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            }
            setMessages(prev => [...prev, aiMessage])
          } else {
            throw new Error(data.error || 'No response from server')
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const errorMessage: Message = {
          id: Date.now() + 1,
          content: mode === 'image' 
            ? 'Sorry, I encountered an error generating the image. Please try again.'
            : 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date(),
          type: mode
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Progressive TTS: Synthesize sentences as they arrive
  const synthesizeSentence = async (sentence: string): Promise<void> => {
    if (!sentence.trim()) return
    
    // Only speak in live mode
    if (!isLiveMode) return

    console.log('[TTS] Starting synthesis for:', sentence.substring(0, 50))
    const startTime = Date.now()

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: sentence })
      })

      if (!response.ok) {
        console.warn('TTS generation failed for sentence')
        return
      }

      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)

      const ttsTime = Date.now() - startTime
      console.log(`[TTS] Generated in ${ttsTime}ms, adding to queue`)

      // Add to queue
      audioQueueRef.current.push({ text: sentence, audio })

      // Start playing if not already playing
      if (!isPlayingAudioRef.current) {
        console.log('[TTS] Starting playback immediately')
        playNextInQueue()
      }
    } catch (error) {
      console.warn('Failed to synthesize sentence:', error)
    }
  }

  // Play audio queue sequentially
  const playNextInQueue = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false
      setIsSpeaking(false)
      ;(window as any).isAISpeaking = false

      // In live mode, restart listening after all audio finishes
      if ((window as any).isLiveModeActive && recognitionRef.current && !isStreaming) {
        setTimeout(() => {
          if ((window as any).isLiveModeActive && !isListening) {
            try {
              recognitionRef.current.start()
              setIsListening(true)
            } catch (error) {
              console.warn('Could not restart recognition:', error)
            }
          }
        }, 150) // Reduced to 150ms for fastest possible response
      }
      return
    }

    isPlayingAudioRef.current = true
    setIsSpeaking(true)
    ;(window as any).isAISpeaking = true

    const { audio, text } = audioQueueRef.current.shift()!

    audio.onended = () => {
      URL.revokeObjectURL(audio.src)
      playNextInQueue()
    }

    audio.onerror = () => {
      console.warn('Audio playback error')
      URL.revokeObjectURL(audio.src)
      playNextInQueue()
    }

    audio.play().catch(error => {
      console.warn('Failed to play audio:', error)
      playNextInQueue()
    })
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

  const handleLiveModeSend = async (transcript: string) => {
    if (!transcript.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now(),
      content: transcript,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    }

    const currentMessages = [...messages, userMessage]
    setMessages(currentMessages)
    setInputMessage('')
    setIsLoading(true)

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const history = messages.filter(msg => msg.type !== 'image').map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: transcript,
          history: history,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to get response')
      }

      // Check if response is streaming or regular JSON
      const contentType = response.headers.get('content-type')
      const isStreamingResponse = contentType?.includes('text/event-stream')

      console.log('[LIVE] Response type:', contentType, 'Streaming:', isStreamingResponse)

      if (isStreamingResponse && response.body) {
        console.log('[LIVE] Starting streaming response handler')
        // Handle streaming response with progressive TTS
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulatedText = ''
        let sentenceBuffer = ''
        
        const aiMessageId = Date.now() + 1
        setIsStreaming(true)

        // Add initial empty AI message
        const aiMessage: Message = {
          id: aiMessageId,
          content: '',
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        }
        setMessages(prev => [...prev, aiMessage])

        try {
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              // Process any remaining sentence
              if (sentenceBuffer.trim()) {
                await synthesizeSentence(sentenceBuffer.trim())
              }
              setIsStreaming(false)
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6)
                  const data = JSON.parse(jsonStr)
                  
                  if (data.done) {
                    continue
                  }

                  if (data.content) {
                    accumulatedText += data.content
                    sentenceBuffer += data.content

                    // Update the AI message with accumulated text
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === aiMessageId 
                          ? { ...msg, content: accumulatedText }
                          : msg
                      )
                    )

                    // Check if we have a complete sentence or phrase
                    // Optimized: sentence end OR comma OR after 3+ words for fast speech without overload
                    const sentenceEndMatch = sentenceBuffer.match(/[.!?]\s|,\s(?=\w{4,})/)
                    const wordCount = sentenceBuffer.split(/\s+/).length
                    
                    console.log('[LIVE] Buffer:', sentenceBuffer.substring(0, 50), 'Words:', wordCount)
                    
                    if (sentenceEndMatch || wordCount >= 3) {
                      let completeSentence = ''
                      
                      if (sentenceEndMatch) {
                        const endIndex = sentenceBuffer.indexOf(sentenceEndMatch[0]) + sentenceEndMatch[0].length
                        completeSentence = sentenceBuffer.substring(0, endIndex).trim()
                        sentenceBuffer = sentenceBuffer.substring(endIndex)
                      } else if (wordCount >= 3) {
                        // Split at last space to avoid cutting words
                        const lastSpaceIndex = sentenceBuffer.lastIndexOf(' ')
                        if (lastSpaceIndex > 0) {
                          completeSentence = sentenceBuffer.substring(0, lastSpaceIndex).trim()
                          sentenceBuffer = sentenceBuffer.substring(lastSpaceIndex + 1)
                        }
                      }

                      // Synthesize the complete sentence/phrase immediately
                      if (completeSentence && completeSentence.length > 1) {
                        console.log('[LIVE] Triggering TTS for:', completeSentence.substring(0, 50))
                        synthesizeSentence(completeSentence) // Don't await - fire and forget for speed
                      }
                    }
                  }
                } catch (e) {
                  console.warn('Failed to parse SSE data:', e)
                }
              }
            }
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('Streaming error:', error)
            throw error
          }
        }
      } else {
        // Handle non-streaming JSON response (fallback)
        const data = await response.json()
        
        if (data.response) {
          const aiMessage: Message = {
            id: Date.now() + 1,
            content: data.response,
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          }
          setMessages(prev => [...prev, aiMessage])
          
          // Speak the full response in live mode
          speakText(data.response)
        } else {
          throw new Error(data.error || 'No response from server')
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const errorMessage: Message = {
          id: Date.now() + 1,
          content: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  // Update the ref whenever the function changes
  useEffect(() => {
    handleLiveSendRef.current = handleLiveModeSend
  }, [handleLiveModeSend])

  const toggleLiveMode = () => {
    if (mode !== 'chat') return

    if (isLiveMode) {
      // Stop live mode
      setIsLiveMode(false)
      ;(window as any).isLiveModeActive = false
      
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.warn('Error stopping recognition:', error)
        }
      }
      
      stopSpeaking()
      setIsListening(false)
      setIsStreaming(false)
    } else {
      // Start live mode
      setIsLiveMode(true)
      ;(window as any).isLiveModeActive = true
      if (recognitionRef.current) {
        try {
          setInputMessage('')
          recognitionRef.current.continuous = true
          recognitionRef.current.start()
          setIsListening(true)
        } catch (error) {
          console.warn('Error starting live mode:', error)
          alert('Could not start live mode. Please check microphone permissions.')
          setIsLiveMode(false)
          ;(window as any).isLiveModeActive = false
        }
      } else {
        alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.')
        setIsLiveMode(false)
        ;(window as any).isLiveModeActive = false
      }
    }
  }

  const toggleVoiceInput = () => {
    if (mode !== 'chat' || isLiveMode) return // Disable in live mode

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      if (recognitionRef.current) {
        try {
          setInputMessage('')
          recognitionRef.current.continuous = false
          recognitionRef.current.start()
          setIsListening(true)
        } catch (error: any) {
          console.error('Error starting recognition:', error)
          if (error.message && error.message.includes('already started')) {
            recognitionRef.current.stop()
            setIsListening(false)
          } else {
            alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.')
          }
        }
      } else {
        alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.')
      }
    }
  }

  const stopSpeaking = () => {
    // Stop speech synthesis
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    
    // Stop any audio elements and clear queue
    const audioElements = document.querySelectorAll('audio')
    audioElements.forEach(audio => {
      audio.pause()
      audio.currentTime = 0
      URL.revokeObjectURL(audio.src)
    })

    // Clear audio queue
    audioQueueRef.current.forEach(({ audio }) => {
      URL.revokeObjectURL(audio.src)
    })
    audioQueueRef.current = []
    isPlayingAudioRef.current = false
    
    setIsSpeaking(false)
    ;(window as any).isAISpeaking = false
  }

  const speakText = (text: string) => {
    if (!text) return

    // Stop any ongoing speech
    if (synthRef.current) {
      synthRef.current.cancel()
    }

    setIsSpeaking(true)
    ;(window as any).isAISpeaking = true

    // Use OpenAI TTS
    fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('TTS failed')
      }
      return response.blob()
    })
    .then(blob => {
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      
      audio.onended = () => {
        setIsSpeaking(false)
        ;(window as any).isAISpeaking = false
        URL.revokeObjectURL(audioUrl)
        
        // In live mode, restart listening after speaking
        if ((window as any).isLiveModeActive && recognitionRef.current) {
          setTimeout(() => {
            if ((window as any).isLiveModeActive && !isListening) {
              try {
                recognitionRef.current.start()
                setIsListening(true)
              } catch (error) {
                console.warn('Could not restart recognition:', error)
              }
            }
          }, 150)
        }
      }
      
      audio.onerror = () => {
        setIsSpeaking(false)
        ;(window as any).isAISpeaking = false
        URL.revokeObjectURL(audioUrl)
        console.error('Audio playback error')
      }
      
      audio.play()
    })
    .catch(error => {
      console.error('TTS error:', error)
      setIsSpeaking(false)
      ;(window as any).isAISpeaking = false
      
      // Fallback to browser TTS if OpenAI fails
      if (synthRef.current) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 1.0
        utterance.pitch = 1.0
        utterance.volume = 1.0
        
        utterance.onend = () => {
          setIsSpeaking(false)
          ;(window as any).isAISpeaking = false
          
          if ((window as any).isLiveModeActive && recognitionRef.current) {
            setTimeout(() => {
              if ((window as any).isLiveModeActive && !isListening) {
                try {
                  recognitionRef.current.start()
                  setIsListening(true)
                } catch (error) {
                  console.warn('Could not restart recognition:', error)
                }
              }
            }, 150)
          }
        }
        
        synthRef.current.speak(utterance)
      }
    })
  }

  // Auto-speak AI responses only in live mode
  // Removed auto-speak from regular chat mode - only speaks in live conversation mode

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
          
          {/* Mode Toggle */}
          <div className="ml-auto flex gap-2 bg-[#2A2A2A] rounded-lg p-1">
            <button
              onClick={() => setMode('chat')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'chat' 
                  ? 'bg-white text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setMode('image')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'image' 
                  ? 'bg-white text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🎨 Image
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center px-4">
                <h2 className="text-2xl md:text-4xl font-semibold text-white mb-6 md:mb-8">
                  {mode === 'chat' ? 'How can I help you today?' : 'What would you like me to create?'}
                </h2>
                {mode === 'chat' ? (
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
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    <button className="p-4 bg-[#2A2A2A] hover:bg-[#343434] rounded-xl text-left transition-colors">
                      <div className="text-white text-sm">A serene mountain landscape</div>
                      <div className="text-gray-400 text-xs mt-1">at sunset with clouds</div>
                    </button>
                    <button className="p-4 bg-[#2A2A2A] hover:bg-[#343434] rounded-xl text-left transition-colors">
                      <div className="text-white text-sm">A futuristic city</div>
                      <div className="text-gray-400 text-xs mt-1">with neon lights</div>
                    </button>
                    <button className="p-4 bg-[#2A2A2A] hover:bg-[#343434] rounded-xl text-left transition-colors">
                      <div className="text-white text-sm">A cute cartoon character</div>
                      <div className="text-gray-400 text-xs mt-1">in vibrant colors</div>
                    </button>
                    <button className="p-4 bg-[#2A2A2A] hover:bg-[#343434] rounded-xl text-left transition-colors">
                      <div className="text-white text-sm">Abstract art</div>
                      <div className="text-gray-400 text-xs mt-1">with geometric shapes</div>
                    </button>
                  </div>
                )}
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
                      ) : message.imageUrl ? (
                        <div className="space-y-3">
                          <p className="text-sm md:text-[15px] text-gray-300 mb-3">{message.content}</p>
                          <div className="rounded-lg overflow-hidden border border-gray-600">
                            <img 
                              src={message.imageUrl} 
                              alt="Generated image" 
                              className="w-full h-auto"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23333" width="400" height="400"/%3E%3Ctext fill="%23999" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage failed to load%3C/text%3E%3C/svg%3E'
                              }}
                            />
                          </div>
                          <a 
                            href={message.imageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open in new tab
                          </a>
                        </div>
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
                    {!message.isUser && isStreaming && message.id === messages[messages.length - 1]?.id && (
                      <div className="flex gap-1 mt-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    )}
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
            {/* Live Mode Interface */}
            {mode === 'chat' && isLiveMode && (
              <div className="flex flex-col items-center gap-4 mb-4">
                {/* Large Visual Indicator */}
                <div className="relative">
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                    isListening 
                      ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/50' 
                      : isSpeaking
                      ? 'bg-gradient-to-br from-blue-400 to-indigo-600 shadow-lg shadow-blue-500/50'
                      : 'bg-gradient-to-br from-gray-600 to-gray-800'
                  }`}>
                    {isListening && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30"></div>
                        <svg className="w-16 h-16 text-white z-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                      </>
                    )}
                    {isSpeaking && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-blue-400 animate-pulse opacity-30"></div>
                        <svg className="w-16 h-16 text-white z-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                        </svg>
                      </>
                    )}
                    {!isListening && !isSpeaking && !isLoading && (
                      <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2z"/>
                      </svg>
                    )}
                    {isLoading && (
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Text */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {isListening ? '🎤 Listening...' : isSpeaking ? '🔊 Speaking...' : isStreaming ? '⚡ Streaming...' : isLoading ? '💭 Thinking...' : '✨ Ready'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {isListening ? 'Speak now' : isSpeaking ? 'AI is responding' : isLoading ? 'Processing your message' : 'Waiting for your voice'}
                  </p>
                </div>

                {/* Stop Button */}
                <button
                  onClick={toggleLiveMode}
                  className="flex items-center gap-3 px-8 py-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg text-lg font-medium"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h12v12H6z"/>
                  </svg>
                  <span>Stop Live Conversation</span>
                </button>
              </div>
            )}

            {/* Start Live Button - only show when not in live mode */}
            {mode === 'chat' && !isLiveMode && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={toggleLiveMode}
                  className="flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white transition-all shadow-lg text-lg font-bold"
                  disabled={isLoading}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8" className="animate-pulse"/>
                  </svg>
                  <span>🎙️ Start Live Conversation</span>
                </button>
              </div>
            )}

            {/* Hide text input in live mode */}
            {!isLiveMode && (
              <div className="bg-[#2A2A2A] rounded-3xl border border-gray-600 flex items-end gap-2 p-2 focus-within:border-gray-500 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={mode === 'chat' ? 'Message VisionAi or use voice input' : 'Describe the image you want to generate...'}
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
            )}
            <p className="text-center text-xs text-gray-500 mt-2">
              {mode === 'chat' 
                ? 'VisionAi can make mistakes. Use 🎤 for voice chat.' 
                : 'VisionAi can make mistakes. Check important info.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}