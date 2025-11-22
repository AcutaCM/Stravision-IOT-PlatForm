"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { WeatherData } from '@/lib/hooks/use-weather'

interface WeatherContextType {
  weatherData: WeatherData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined)

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)

  // Get user's geolocation once
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          })
        },
        (error) => {
          console.warn('[WeatherContext] Geolocation error:', error)
          // Continue without geolocation (will use default location)
          setLocation(null)
        }
      )
    }
  }, [])

  const fetchWeather = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build URL with location if available
      let url = '/api/weather'
      if (location) {
        url += `?lat=${location.lat}&lon=${location.lon}`
      }
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather data')
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setWeatherData(data)
    } catch (err) {
      console.error('[WeatherContext] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()
    
    // Refresh weather data every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [location])

  return (
    <WeatherContext.Provider value={{ weatherData, loading, error, refetch: fetchWeather }}>
      {children}
    </WeatherContext.Provider>
  )
}

export function useWeatherContext() {
  const context = useContext(WeatherContext)
  if (context === undefined) {
    throw new Error('useWeatherContext must be used within a WeatherProvider')
  }
  return context
}
