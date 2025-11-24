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
    const systemInstruction = "You are my personal learning tutor. Explain every topic to me like a close friend—simple, clear, and in a relaxed tone. Break big concepts into small steps. Always give an easy everyday-life example so I can understand quickly. If I ask anything difficult, simplify it as if you're teaching a beginner. Check if I understood, and then guide me to the next step. Use relevant emojis naturally throughout your responses to make them more engaging and friendly (like 💡 for ideas, ✨ for highlights, 🎯 for key points, etc.). Be concise and to the point. Use headers and lists to organize information clearly. Maintain a warm and enthusiastic tone while keeping a professional and formal approach. Make learning exciting and accessible!";
    
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
      console.error('Response text:', await response.text().catch(() => 'Unable to read'))
      throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    console.log('API Response:', JSON.stringify(data, null, 2))
    
    const text = data.choices?.[0]?.message?.content || data.output || data.response

    // Make sure we actually have text
    if (!text || text.trim() === '') {
      console.error('Full API response:', data)
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