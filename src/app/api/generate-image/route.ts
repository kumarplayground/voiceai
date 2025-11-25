import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const requestBody = await request.json()
  const { prompt } = requestBody
  
  try {
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
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

    // Call ModelsLab Text-to-Image API
    console.log('Generating image with prompt:', prompt)
    
    const response = await fetch('https://modelslab.com/api/v7/images/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: apiKey,
        model_id: 'nano-banana-pro',
        prompt: prompt,
        aspect_ratio: '1:1'
      })
    })

    if (!response.ok) {
      let errorResult
      try {
        errorResult = await response.json()
      } catch (e) {
        errorResult = { error: { message: await response.text() } }
      }
      console.error('ModelsLab API error:', response.status, errorResult)
      throw new Error(`API Error (${response.status}): ${errorResult.error?.message || response.statusText || 'Unknown error'}`)
    }

    const data = await response.json()
    console.log('Image API Response:', JSON.stringify(data, null, 2))

    if (data.status === 'error') {
      console.error('ModelsLab API error:', data)
      const errorMsg = data.message || data.error || 'API request failed'
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      )
    }
    
    // ModelsLab API returns different formats based on status
    let imageUrl = null
    
    if (data.status === 'success' && data.output) {
      // Direct success with image URL
      imageUrl = Array.isArray(data.output) ? data.output[0] : data.output
    } else if (data.status === 'processing' && data.future_links) {
      // Processing status - try to get the future link
      imageUrl = Array.isArray(data.future_links) ? data.future_links[0] : data.future_links
    } else if (data.output) {
      // Fallback to output field
      imageUrl = Array.isArray(data.output) ? data.output[0] : data.output
    } else if (data.image) {
      imageUrl = data.image
    } else if (data.url) {
      imageUrl = data.url
    }
    
    if (!imageUrl) {
      console.error('No image URL found in response:', data)
      return NextResponse.json(
        { 
          error: 'No image URL in API response. This could be due to API credits or invalid request.',
          debug: data
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      imageUrl: imageUrl,
      status: data.status || 'success',
      message: data.message || 'Image generated successfully'
    })
  } catch (error: any) {
    console.error('Error generating image:', error)
    console.error('Error details:', error.message, error.stack)
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    )
  }
}
