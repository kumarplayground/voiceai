import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.MODEL_LAB_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ModelsLab API key not configured' },
        { status: 500 }
      )
    }

    // Call ModelsLab TTS API (v7 with ElevenLabs model)
    const response = await fetch('https://modelslab.com/api/v7/voice/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: apiKey,
        model_id: 'eleven_multilingual_v2',
        prompt: text,
        voice_id: 'M7baJQBjzMsrxxZ796H6',  // ElevenLabs voice ID - change as needed
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('ModelsLab TTS API error:', response.status, errorData)
      throw new Error(`TTS API request failed with status ${response.status}`)
    }

    const data = await response.json()
    
    // Check if response is successful and has audio output
    if (data.status === 'success' && data.output && data.output.length > 0) {
      // Fetch the actual audio file from the returned URL
      const audioUrl = data.output[0]
      const audioResponse = await fetch(audioUrl)
      
      if (!audioResponse.ok) {
        throw new Error('Failed to fetch generated audio file')
      }

      const audioBuffer = await audioResponse.arrayBuffer()
      
      // Return audio with proper headers
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
        },
      })
    } else {
      throw new Error(data.message || 'TTS generation failed')
    }
  } catch (error: any) {
    console.error('Error generating speech:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate speech' },
      { status: 500 }
    )
  }
}
