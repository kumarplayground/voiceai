import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Test simple text generation with different models
    const testModels = [
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
      'gemini-pro',
      'models/gemini-pro',
      'gemini-1.5-flash',
      'text-bison-001'
    ]

    const results = []
    
    for (const modelName of testModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent('Say hello')
        const response = await result.response
        const text = response.text()
        results.push({ model: modelName, status: 'success', response: text.substring(0, 50) })
        break // If one works, use that one
      } catch (error: any) {
        results.push({ model: modelName, status: 'error', error: error.message.substring(0, 100) })
      }
    }

    return NextResponse.json({ 
      apiKeyExists: !!apiKey,
      modelTests: results
    })
  } catch (error) {
    console.error('Error testing models:', error)
    return NextResponse.json(
      { error: 'Failed to test models' },
      { status: 500 }
    )
  }
}