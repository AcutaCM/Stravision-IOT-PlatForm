/**
 * Custom Hook for Device Control
 * 
 * Provides functions to send control commands to devices via HTTP API
 */

import { useState, useCallback } from 'react'

export interface ControlCommand {
  type: 'relay' | 'led'
  relayNum?: number
  newState?: number
  led1?: number
  led2?: number
  led3?: number
  led4?: number
}

export interface ControlResponse {
  success: boolean
  message: string
  timestamp: number
}

export interface ControlStatus {
  loading: boolean
  error: string | null
  lastCommand: ControlCommand | null
}

export function useDeviceControl() {
  const [status, setStatus] = useState<ControlStatus>({
    loading: false,
    error: null,
    lastCommand: null
  })

  const sendCommand = useCallback(async (command: ControlCommand): Promise<boolean> => {
    setStatus({
      loading: true,
      error: null,
      lastCommand: command
    })

    try {
      console.log('[Control] Sending command:', command)

      const response = await fetch('/api/mqtt/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command)
      })

      const result: ControlResponse = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to send command')
      }

      console.log('[Control] Command sent successfully:', result)

      setStatus({
        loading: false,
        error: null,
        lastCommand: command
      })

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Control] Failed to send command:', errorMessage)

      setStatus({
        loading: false,
        error: errorMessage,
        lastCommand: command
      })

      return false
    }
  }, [])

  const toggleRelay = useCallback(async (relayNum: number, currentState: number): Promise<boolean> => {
    const newState = currentState === 1 ? 0 : 1
    return sendCommand({
      type: 'relay',
      relayNum,
      newState
    })
  }, [sendCommand])

  const setLEDs = useCallback(async (led1: number, led2: number, led3: number, led4: number): Promise<boolean> => {
    return sendCommand({
      type: 'led',
      led1,
      led2,
      led3,
      led4
    })
  }, [sendCommand])

  return {
    status,
    sendCommand,
    toggleRelay,
    setLEDs
  }
}
