import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key' }, { status: 500 })
    }

    // Test direct API call to list models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json({
        error: 'API call failed',
        status: response.status,
        statusText: response.statusText,
        details: data
      })
    }

    return NextResponse.json({
      success: true,
      availableModels: data.models?.map((m: any) => m.name) || [],
      fullResponse: data
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Request failed',
      message: error.message
    })
  }
}