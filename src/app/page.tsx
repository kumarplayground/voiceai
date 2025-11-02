'use client'

import { useState } from 'react'
import ChatInterface from '@/components/ChatInterface'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI Chat Assistant
          </h1>
          <p className="text-gray-600">
            Powered by Google Gemini API
          </p>
        </header>
        <ChatInterface />
      </div>
    </main>
  )
}