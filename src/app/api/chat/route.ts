import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const requestBody = await request.json()
  const { message, history = [], stream = true } = requestBody
  
  try {
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = process.env.MODEL_LAB_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Model Lab API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Call Model Lab API with GPT OSS 120b model
    const systemInstruction = "You are a friendly tutor. Keep responses concise (2-3 sentences max unless asked for detail). Use simple language with everyday examples. Add relevant emojis. Be warm, clear, and direct.";
    
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
        max_tokens: 1500,      // Reduced from 2000 for faster completion
        temperature: 0.6,      // Reduced from 0.7 for more focused responses
        stream: stream
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Model Lab API error:', response.status, errorData)
      
      // If streaming fails, try non-streaming
      if (stream) {
        console.log('Streaming failed, falling back to non-streaming mode')
        return POST(request) // Retry with stream disabled
      }
      
      throw new Error(`API request failed with status ${response.status}`)
    }

    // Check if response is actually streamable
    const contentType = response.headers.get('content-type')
    const isStreamResponse = contentType?.includes('text/event-stream') || contentType?.includes('application/x-ndjson')

    // If streaming is enabled and response supports it
    if (stream && response.body && isStreamResponse) {
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      const readableStream = new ReadableStream({
        async start(controller) {
          const reader = response.body!.getReader()
          let buffer = ''

          try {
            while (true) {
              const { done, value } = await reader.read()
              
              if (done) {
                if (buffer.trim()) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
                }
                controller.close()
                break
              }

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed || trimmed === 'data: [DONE]') continue
                
                if (trimmed.startsWith('data: ')) {
                  try {
                    const jsonStr = trimmed.slice(6)
                    const parsed = JSON.parse(jsonStr)
                    const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content
                    
                    if (content) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                    }
                  } catch (e) {
                    console.warn('Failed to parse SSE line:', trimmed)
                  }
                }
              }
            }
          } catch (error) {
            console.error('Stream reading error:', error)
            controller.error(error)
          }
        }
      })

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Fallback to non-streaming
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || data.output || data.response

    if (!text || text.trim() === '') {
      throw new Error('Empty response from model')
    }

    return new Response(
      JSON.stringify({ response: text }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error calling Model Lab API:', error)
    
    return new Response(
      JSON.stringify({ error: 'Failed to generate response from GPT OSS 120b model' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}