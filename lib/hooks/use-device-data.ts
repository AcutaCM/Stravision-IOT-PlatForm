/**
 * Custom Hook for Device Data via SSE
 * 
 * Manages EventSource connection to receive real-time device data
 * from the MQTT backend via Server-Sent Events.
 */

import { useEffect, useState, useCallback, useRef } from 'react'

export interface DeviceData {
  temperature: number
  humidity: number
  light: number
  co2: number
  earth_temp: number
  earth_water: number
  earth_ec: number
  earth_n: number
  earth_p: number
  earth_k: number
  relay5: number
  relay6: number
  relay7: number
  relay8: number
  led1: number
  led2: number
  led3: number
  led4: number
  timestamp?: number
}

export interface ConnectionStatus {
  connected: boolean
  error: string | null
  lastUpdate: Date | null
}

export function useDeviceData() {
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    error: null,
    lastUpdate: null
  })
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    try {
      console.log('[SSE] Connecting to /api/mqtt/stream...')
      const eventSource = new EventSource('/api/mqtt/stream')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('[SSE] Connection established')
        setConnectionStatus({
          connected: true,
          error: null,
          lastUpdate: new Date()
        })
        reconnectAttemptsRef.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'connected') {
            console.log('[SSE] Connected message received')
          } else if (message.type === 'data' && message.data) {
            console.log('[SSE] Device data received')
            setDeviceData(message.data)
            setConnectionStatus(prev => ({
              ...prev,
              lastUpdate: new Date()
            }))
          } else if (message.type === 'error') {
            console.error('[SSE] Error message:', message.error)
            setConnectionStatus(prev => ({
              ...prev,
              error: message.error || 'Unknown error'
            }))
          }
        } catch (error) {
          console.error('[SSE] Failed to parse message:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error)
        
        setConnectionStatus({
          connected: false,
          error: 'Connection lost',
          lastUpdate: null
        })

        // Close the connection
        eventSource.close()
        eventSourceRef.current = null

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000)
          
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          console.error('[SSE] Max reconnection attempts reached')
          setConnectionStatus(prev => ({
            ...prev,
            error: 'Failed to connect after multiple attempts'
          }))
        }
      }
    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error)
      setConnectionStatus({
        connected: false,
        error: 'Failed to initialize connection',
        lastUpdate: null
      })
    }
  }, [])

  const disconnect = useCallback(() => {
    console.log('[SSE] Disconnecting...')
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    setConnectionStatus({
      connected: false,
      error: null,
      lastUpdate: null
    })
  }, [])

  // Auto-connect on mount, disconnect on unmount
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    deviceData,
    connectionStatus,
    reconnect: connect
  }
}
