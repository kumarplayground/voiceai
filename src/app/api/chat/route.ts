import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const requestBody = await request.json()
  const { message } = requestBody
  
  try {
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Use a simpler model without thinking mode
    const model = genAI.getGenerativeModel({ 
      model: 'models/gemini-2.0-flash'
    })

    const result = await model.generateContent(message)
    const response = await result.response
    const text = response.text()

    // Make sure we actually have text
    if (!text || text.trim() === '') {
      throw new Error('Empty response from model')
    }

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error('Error calling Gemini API:', error)
    console.error('API Key exists:', !!process.env.GEMINI_API_KEY)
    console.error('Message received:', message)
    
    // Try to provide more helpful error information
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        { error: 'Model not found. Please check your API key has access to Gemini models.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}