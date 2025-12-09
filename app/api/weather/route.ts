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
    const useIP = searchParams.get('useIP') === 'true'

    // Get API key from environment variables
    const apiKey = process.env.WEATHER_API_KEY || ''

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Weather API key not configured' },
        { status: 500 }
      )
    }

    let location = 'Ningbo,China'
    let locationSource = 'default'

    const isPrivateIPv4 = (ip: string) => {
      const m = ip.match(/^([0-9]{1,3}\.){3}[0-9]{1,3}$/)
      if (!m) return false
      const [a, b] = ip.split('.').map(Number)
      if (a === 10) return true
      if (a === 172 && b >= 16 && b <= 31) return true
      if (a === 192 && b === 168) return true
      if (a === 127) return true
      return false
    }
    const normalizeIp = (ip: string | null) => {
      if (!ip) return null
      const first = ip.split(',')[0].trim()
      const mapped = first.startsWith('::ffff:') ? first.replace('::ffff:', '') : first
      return mapped
    }

    if (lat && lon) {
      location = `${lat},${lon}`
      locationSource = 'gps'
    } else {
      const forwardedFor = normalizeIp(request.headers.get('x-forwarded-for'))
      const realIp = normalizeIp(request.headers.get('x-real-ip'))
      const candidateIp = forwardedFor || realIp

      const shouldUseHeaderIp = !!candidateIp && candidateIp !== '::1' && candidateIp !== '127.0.0.1' && !isPrivateIPv4(candidateIp) && !useIP

      if (shouldUseHeaderIp) {
        location = candidateIp as string
        locationSource = 'client-ip'
      } else if (useIP) {
        try {
          const ipResponse = await fetch('https://ipapi.co/json', { next: { revalidate: 3600 } })
          if (ipResponse.ok) {
            const ipData = await ipResponse.json()
            if (ipData && ipData.city) {
              location = ipData.city
              locationSource = 'external-ip-api'
              console.log('[Weather API] Detected location from ipapi.co:', location)
            } else {
              location = 'auto:ip'
              locationSource = 'server-ip'
            }
          } else {
            location = 'auto:ip'
            locationSource = 'server-ip'
          }
        } catch (e) {
          console.error('[Weather API] Failed to fetch from ipapi.co:', e)
          location = 'auto:ip'
          locationSource = 'server-ip'
        }
      }
    }

    // Build API URL for forecast (7 days)
    const apiUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${location}&days=7&aqi=no&alerts=no`

    console.log('[Weather API] Fetching weather for location:', location, '(source:', locationSource + ')')

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

    console.log('[Weather API] Successfully fetched weather data for', data.location?.name)

    // Add location source to response
    return NextResponse.json({
      ...data,
      locationSource
    })

  } catch (error) {
    console.error('[Weather API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch weather data' },
      { status: 500 }
    )
  }
}
