/**
 * MQTT Control API Route
 * 
 * HTTP POST endpoint for sending control commands to IoT devices via MQTT.
 * Handles relay control and LED brightness adjustment.
 */

import { NextRequest, NextResponse } from 'next/server'
import { MQTTService } from '@/lib/mqtt-service'

/**
 * Verify JWT token from request headers (optional)
 * 
 * @param {NextRequest} request - The incoming request
 * @returns {boolean} True if authentication is disabled or token is valid
 */
function verifyAuthentication(request: NextRequest): boolean {
  // Check if authentication is required
  const requireAuth = process.env.MQTT_CONTROL_REQUIRE_AUTH === 'true'
  
  if (!requireAuth) {
    return true // Authentication not required
  }

  // Get authorization header
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  // Extract token
  const token = authHeader.substring(7)
  
  // TODO: Implement JWT verification using lib/auth.ts getJwtSecret()
  // For now, just check if token exists
  return token.length > 0
}

/**
 * Log structured message
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {any} data - Optional additional data
 */
function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    component: 'Control-API',
    message,
    ...(data && { data })
  }

  if (level === 'ERROR') {
    console.error(JSON.stringify(logEntry))
  } else if (level === 'WARN') {
    console.warn(JSON.stringify(logEntry))
  } else {
    console.log(JSON.stringify(logEntry))
  }
}

/**
 * Control Request Interface
 * Defines the structure of incoming control command requests
 */
interface ControlRequest {
  type: 'relay' | 'led'
  relayNum?: number       // Relay number (5-8)
  newState?: number       // Relay state (0/1)
  led1?: number           // LED 1 brightness (0-255)
  led2?: number           // LED 2 brightness (0-255)
  led3?: number           // LED 3 brightness (0-255)
  led4?: number           // LED 4 brightness (0-255)
}

/**
 * Control Response Interface
 * Defines the structure of API responses
 */
interface ControlResponse {
  success: boolean
  message: string
  timestamp: number
}

/**
 * Validate control request data
 * 
 * @param {ControlRequest} data - Request data to validate
 * @returns {string | null} Error message if invalid, null if valid
 */
function validateControlRequest(data: ControlRequest): string | null {
  // Validate type field
  if (!data.type || (data.type !== 'relay' && data.type !== 'led')) {
    return 'Invalid or missing type field. Must be "relay" or "led"'
  }

  // Validate relay command
  if (data.type === 'relay') {
    if (data.relayNum === undefined) {
      return 'Missing relayNum field for relay command'
    }
    if (data.newState === undefined) {
      return 'Missing newState field for relay command'
    }
    if (data.relayNum < 5 || data.relayNum > 8) {
      return 'relayNum must be between 5 and 8'
    }
    if (data.newState !== 0 && data.newState !== 1) {
      return 'newState must be 0 or 1'
    }
  }

  // Validate LED command
  if (data.type === 'led') {
    const validateLED = (value: number | undefined, name: string): string | null => {
      if (value !== undefined && (value < 0 || value > 255)) {
        return `${name} must be between 0 and 255`
      }
      return null
    }

    const led1Error = validateLED(data.led1, 'led1')
    if (led1Error) return led1Error

    const led2Error = validateLED(data.led2, 'led2')
    if (led2Error) return led2Error

    const led3Error = validateLED(data.led3, 'led3')
    if (led3Error) return led3Error

    const led4Error = validateLED(data.led4, 'led4')
    if (led4Error) return led4Error

    // At least one LED value should be provided
    if (data.led1 === undefined && data.led2 === undefined && 
        data.led3 === undefined && data.led4 === undefined) {
      return 'At least one LED value (led1, led2, led3, or led4) must be provided'
    }
  }

  return null
}

/**
 * POST /api/mqtt/control
 * 
 * Receives control commands from frontend and sends them to devices via MQTT.
 * 
 * @param {NextRequest} req - Next.js request object
 * @returns {NextResponse} JSON response with success status
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication (optional)
    if (!verifyAuthentication(req)) {
      log('WARN', 'Unauthorized control command attempt')
      
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          timestamp: Date.now()
        } as ControlResponse,
        { status: 401 }
      )
    }

    // Parse request body
    let body: ControlRequest
    try {
      body = await req.json()
    } catch (error) {
      log('WARN', 'Invalid JSON in request body', { error })
      
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON in request body',
          timestamp: Date.now()
        } as ControlResponse,
        { status: 400 }
      )
    }

    // Validate request data
    const validationError = validateControlRequest(body)
    if (validationError) {
      log('WARN', 'Request validation failed', { error: validationError, body })
      
      return NextResponse.json(
        {
          success: false,
          message: validationError,
          timestamp: Date.now()
        } as ControlResponse,
        { status: 400 }
      )
    }

    // Get MQTT service instance
    const mqttService = MQTTService.getInstance()

    // Connect to MQTT if not already connected
    if (!mqttService.isConnected()) {
      log('INFO', 'MQTT not connected, attempting to connect...')
      
      try {
        await mqttService.connect()
        log('INFO', 'MQTT connection established successfully')
      } catch (error) {
        log('ERROR', 'Failed to connect to MQTT service', error)
        
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to connect to MQTT service',
            timestamp: Date.now()
          } as ControlResponse,
          { status: 503 }
        )
      }
    }

    // Log control command attempt
    log('INFO', 'Sending control command', { 
      type: body.type,
      ...(body.type === 'relay' && { relayNum: body.relayNum, newState: body.newState }),
      ...(body.type === 'led' && { led1: body.led1, led2: body.led2, led3: body.led3, led4: body.led4 })
    })

    // Send control command via MQTT
    try {
      await mqttService.sendControlCommand({
        type: body.type,
        relayNum: body.relayNum,
        newState: body.newState,
        led1: body.led1,
        led2: body.led2,
        led3: body.led3,
        led4: body.led4
      })

      log('INFO', 'Control command sent successfully', { type: body.type })

      // Return success response
      return NextResponse.json(
        {
          success: true,
          message: 'Control command sent successfully',
          timestamp: Date.now()
        } as ControlResponse,
        { status: 200 }
      )

    } catch (error) {
      // Handle MQTT command send failure
      log('ERROR', 'Failed to send control command via MQTT', { 
        error: error instanceof Error ? error.message : String(error),
        body 
      })
      
      return NextResponse.json(
        {
          success: false,
          message: `Failed to send command: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now()
        } as ControlResponse,
        { status: 500 }
      )
    }

  } catch (error) {
    // Catch any unexpected errors
    log('ERROR', 'Unexpected error in control API handler', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        timestamp: Date.now()
      } as ControlResponse,
      { status: 500 }
    )
  }
}
