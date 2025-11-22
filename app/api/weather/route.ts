/**
 * Weather API Route
 * 
 * Proxies requests to WeatherAPI.com
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    
    // Get API key from environment variables
    const apiKey = process.env.WEATHER_API_KEY || ''
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Weather API key not configured' },
        { status: 500 }
      )
    }
    
    // Build location query
    let location = 'Ningbo,China' // Default location
    if (lat && lon) {
      location = `${lat},${lon}`
    }
    
    // Build API URL for forecast (7 days)
    const apiUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${location}&days=7&aqi=no&alerts=no`
    
    console.log('[Weather API] Fetching weather for location:', location)
    
    // Fetch weather data
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache for 30 minutes
      next: { revalidate: 1800 }
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Weather API returned ${response.status}: ${errorData.error?.message || 'Unknown error'}`)
    }
    
    const data = await response.json()
    
    console.log('[Weather API] Successfully fetched weather data')
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('[Weather API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch weather data' },
      { status: 500 }
    )
  }
}
