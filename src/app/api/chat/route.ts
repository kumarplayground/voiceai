import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const requestBody = await request.json()
  const { message, history = [] } = requestBody
  
  try {
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.MODEL_LAB_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Model Lab API key not configured' },
        { status: 500 }
      )
    }

    // Call Model Lab API with GPT OSS 120b model
    const systemInstruction = "You are a helpful AI assistant similar to ChatGPT. Respond in a natural, conversational tone with clean formatting. Use simple paragraphs and occasional bullet points when listing things, but avoid heavy markdown formatting like tables, excessive bold text, or complex structures. Use relevant emojis naturally throughout your responses to make them more engaging and friendly (like 💡 for ideas, ✨ for highlights, 🎯 for key points, etc.). Keep responses clear and readable like a friendly conversation. Be honest and direct - don't sugarcoat things or act like a yes-man. Challenge incorrect thinking and provide real, actionable advice. Focus on being helpful and genuine rather than overly formal or structured.";
    
    // Build messages array with conversation history
    const messages = [
      {
        role: 'system',
        content: systemInstruction
      },
      ...history,
      {
        role: 'user',
        content: message
      }
    ];
    
    const response = await fetch('https://modelslab.com/api/v7/llm/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: apiKey,
        model_id: 'gpt-oss-120b',
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Model Lab API error:', response.status, errorData)
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content

    // Make sure we actually have text
    if (!text || text.trim() === '') {
      throw new Error('Empty response from model')
    }

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error('Error calling Model Lab API:', error)
    console.error('API Key exists:', !!process.env.MODEL_LAB_API_KEY)
    console.error('Message received:', message)
    
    return NextResponse.json(
      { error: 'Failed to generate response from GPT OSS 120b model' },
      { status: 500 }
    )
  }
}