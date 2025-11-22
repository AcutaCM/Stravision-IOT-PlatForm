/**
 * MQTT Service Module
 * 
 * Singleton service that manages MQTT connection, message handling,
 * and provides interfaces for data subscription and control commands.
 */

import mqtt from 'mqtt'
import { MQTTConfig, getValidatedMQTTConfig } from './mqtt-config'

/**
 * Device Data Interface
 * Represents the structure of data received from IoT devices
 */
export interface DeviceData {
  temperature: number      // Temperature (°C * 10)
  humidity: number         // Humidity (% * 10)
  light: number           // Light intensity (lux)
  co2: number             // CO2 concentration (ppm)
  earth_temp: number      // Soil temperature (°C * 10)
  earth_water: number     // Soil moisture (%)
  earth_ec: number        // EC value (μS/cm)
  earth_n: number         // Nitrogen (mg/kg)
  earth_p: number         // Phosphorus (mg/kg)
  earth_k: number         // Potassium (mg/kg)
  relay5: number          // Relay 5 state (0/1)
  relay6: number          // Relay 6 state (0/1)
  relay7: number          // Relay 7 state (0/1)
  relay8: number          // Relay 8 state (0/1)
  led1: number            // LED 1 brightness (0-255)
  led2: number            // LED 2 brightness (0-255)
  led3: number            // LED 3 brightness (0-255)
  led4: number            // LED 4 brightness (0-255)
  timestamp?: number      // Timestamp when data was received
}

/**
 * Control Command Interface
 * Represents control commands to be sent to devices
 */
export interface ControlCommand {
  type: 'relay' | 'led'
  relayNum?: number       // Relay number (5-8)
  newState?: number       // New relay state (0/1)
  led1?: number           // LED 1 brightness (0-255)
  led2?: number           // LED 2 brightness (0-255)
  led3?: number           // LED 3 brightness (0-255)
  led4?: number           // LED 4 brightness (0-255)
}

/**
 * Data Listener Callback Type
 */
type DataListener = (data: DeviceData) => void

/**
 * MQTTService Singleton Class
 * 
 * Manages MQTT connection lifecycle, message handling, and provides
 * interfaces for subscribing to device data and sending control commands.
 */
export class MQTTService {
  private static instance: MQTTService
  private client: mqtt.MqttClient | null = null
  private config: MQTTConfig
  private latestData: DeviceData | null = null
  private dataListeners: Set<DataListener> = new Set()

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.config = getValidatedMQTTConfig()
  }

  /**
   * Get singleton instance of MQTTService
   * 
   * @returns {MQTTService} The singleton instance
   */
  public static getInstance(): MQTTService {
    if (!MQTTService.instance) {
      MQTTService.instance = new MQTTService()
    }
    return MQTTService.instance
  }

  /**
   * Connect to MQTT Broker
   * 
   * Establishes TLS/SSL connection to the MQTT broker using configured credentials.
   * Sets up event handlers for connection lifecycle events.
   * 
   * @returns {Promise<void>} Resolves when connection is established
   * @throws {Error} If connection fails after retries
   */
  public async connect(): Promise<void> {
    if (this.client && this.client.connected) {
      this.log('INFO', 'MQTT client already connected')
      return
    }

    return new Promise((resolve, reject) => {
      try {
        const protocol = this.config.useSSL ? 'mqtts' : 'mqtt'
        const brokerUrl = `${protocol}://${this.config.host}:${this.config.port}`

        this.log('INFO', `Connecting to MQTT broker: ${brokerUrl}`)

        // Create MQTT client with connection options
        this.client = mqtt.connect(brokerUrl, {
          username: this.config.username,
          password: this.config.password,
          keepalive: this.config.keepalive,
          reconnectPeriod: this.config.reconnectPeriod,
          clean: true,
          clientId: `mqtt_service_${Math.random().toString(16).slice(2, 10)}`
        })

        // Connection successful event
        this.client.on('connect', () => {
          this.log('INFO', 'MQTT connection established successfully')
          
          // Subscribe to device data topic
          this.client!.subscribe(this.config.subscribeTopic, { qos: 1 }, (err) => {
            if (err) {
              this.log('ERROR', `Failed to subscribe to topic: ${this.config.subscribeTopic}`, err)
            } else {
              this.log('INFO', `Subscribed to topic: ${this.config.subscribeTopic}`)
            }
          })
          
          resolve()
        })

        // Message received event
        this.client.on('message', (topic, payload) => {
          this.handleMessage(topic, payload)
        })

        // Connection error event
        this.client.on('error', (error) => {
          this.log('ERROR', `MQTT connection error: ${error.message}`, error)
          reject(error)
        })

        // Connection closed event
        this.client.on('close', () => {
          this.log('INFO', 'MQTT connection closed')
        })

        // Reconnect event
        this.client.on('reconnect', () => {
          this.log('INFO', 'MQTT attempting to reconnect...')
        })

        // Offline event
        this.client.on('offline', () => {
          this.log('WARN', 'MQTT client is offline')
        })

      } catch (error) {
        this.log('ERROR', `Failed to create MQTT client: ${error}`, error)
        reject(error)
      }
    })
  }

  /**
   * Disconnect from MQTT Broker
   * 
   * Gracefully closes the MQTT connection and cleans up resources.
   */
  public disconnect(): void {
    if (this.client) {
      this.log('INFO', 'Disconnecting from MQTT broker')
      this.client.end(false, {}, () => {
        this.log('INFO', 'MQTT client disconnected')
      })
      this.client = null
    }
  }

  /**
   * Check if MQTT client is connected
   * 
   * @returns {boolean} True if connected, false otherwise
   */
  public isConnected(): boolean {
    return this.client !== null && this.client.connected
  }

  /**
   * Get latest cached device data
   * 
   * @returns {DeviceData | null} Latest device data or null if no data received yet
   */
  public getLatestData(): DeviceData | null {
    return this.latestData
  }

  /**
   * Subscribe to device data updates
   * 
   * Registers a callback function that will be called whenever new device data arrives.
   * Returns an unsubscribe function to remove the listener.
   * 
   * @param {DataListener} callback - Function to call when new data arrives
   * @returns {Function} Unsubscribe function to remove the listener
   */
  public subscribeToData(callback: DataListener): () => void {
    this.dataListeners.add(callback)
    
    this.log('INFO', `Data listener added. Total listeners: ${this.dataListeners.size}`)
    
    // Return unsubscribe function
    return () => {
      this.dataListeners.delete(callback)
      this.log('INFO', `Data listener removed. Total listeners: ${this.dataListeners.size}`)
    }
  }

  /**
   * Send control command to device
   * 
   * Constructs device protocol payload and publishes to MQTT broker.
   * 
   * @param {ControlCommand} command - Control command to send
   * @returns {Promise<void>} Resolves when command is published
   * @throws {Error} If client is not connected or publish fails
   */
  public async sendControlCommand(command: ControlCommand): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('MQTT client is not connected')
    }

    try {
      const payload = this.buildControlPayload(command)
      const payloadString = JSON.stringify(payload)

      this.log('INFO', `Sending control command: ${command.type}`, command)

      return new Promise((resolve, reject) => {
        this.client!.publish(
          this.config.publishTopic,
          payloadString,
          { qos: 1 },
          (error) => {
            if (error) {
              this.log('ERROR', `Failed to publish control command: ${error.message}`, error)
              reject(error)
            } else {
              this.log('INFO', `Control command published successfully`)
              resolve()
            }
          }
        )
      })
    } catch (error) {
      this.log('ERROR', `Error building control command: ${error}`, error)
      throw error
    }
  }

  /**
   * Build control payload according to device protocol
   * 
   * Constructs the rw_prot structure with appropriate node mappings.
   * 
   * @param {ControlCommand} command - Control command
   * @returns {object} Device protocol payload
   */
  private buildControlPayload(command: ControlCommand): object {
    const id = Math.random().toString(36).substring(2, 15)
    
    if (command.type === 'relay') {
      // Validate relay command
      if (command.relayNum === undefined || command.newState === undefined) {
        throw new Error('Relay command requires relayNum and newState')
      }
      if (command.relayNum < 5 || command.relayNum > 8) {
        throw new Error('Relay number must be between 5 and 8')
      }
      if (command.newState !== 0 && command.newState !== 1) {
        throw new Error('Relay state must be 0 or 1')
      }

      // Map relay numbers to node IDs (relay5->node0601, relay6->node0602, etc.)
      const nodeNum = command.relayNum - 4 // relay5->1, relay6->2, relay7->3, relay8->4
      const nodeName = `node060${nodeNum}`

      return {
        rw_prot: {
          Ver: '1.0.1',
          dir: 'down',
          id,
          w_data: [
            { name: nodeName, value: String(command.newState) }
          ]
        }
      }
    } else if (command.type === 'led') {
      // Validate LED command
      const led1 = command.led1 !== undefined ? command.led1 : 0
      const led2 = command.led2 !== undefined ? command.led2 : 0
      const led3 = command.led3 !== undefined ? command.led3 : 0
      const led4 = command.led4 !== undefined ? command.led4 : 0

      // Validate LED values (0-255)
      const validateLED = (value: number, name: string) => {
        if (value < 0 || value > 255) {
          throw new Error(`${name} must be between 0 and 255`)
        }
      }

      validateLED(led1, 'LED1')
      validateLED(led2, 'LED2')
      validateLED(led3, 'LED3')
      validateLED(led4, 'LED4')

      // Map LEDs to node IDs (led1->node0501, led2->node0502, etc.)
      return {
        rw_prot: {
          Ver: '1.0.1',
          dir: 'down',
          id,
          w_data: [
            { name: 'node0501', value: String(led1) },
            { name: 'node0502', value: String(led2) },
            { name: 'node0503', value: String(led3) },
            { name: 'node0504', value: String(led4) }
          ]
        }
      }
    } else {
      throw new Error(`Unknown command type: ${command.type}`)
    }
  }

  /**
   * Handle incoming MQTT message
   * 
   * Parses JSON payload, validates and transforms data, updates cache,
   * and notifies all registered listeners.
   * 
   * @param {string} topic - MQTT topic
   * @param {Buffer} payload - Message payload
   */
  private handleMessage(topic: string, payload: Buffer): void {
    try {
      const message = payload.toString()
      
      // Parse JSON data
      const rawData = JSON.parse(message)
      
      // Transform and validate device data
      const deviceData: DeviceData = {
        temperature: this.parseNumber(rawData.temperature, 0),
        humidity: this.parseNumber(rawData.humidity, 0),
        light: this.parseNumber(rawData.light, 0),
        co2: this.parseNumber(rawData.co2, 0),
        earth_temp: this.parseNumber(rawData.earth_temp, 0),
        earth_water: this.parseNumber(rawData.earth_water, 0),
        earth_ec: this.parseNumber(rawData.earth_ec, 0),
        earth_n: this.parseNumber(rawData.earth_n, 0),
        earth_p: this.parseNumber(rawData.earth_p, 0),
        earth_k: this.parseNumber(rawData.earth_k, 0),
        relay5: this.parseNumber(rawData.relay5, 0),
        relay6: this.parseNumber(rawData.relay6, 0),
        relay7: this.parseNumber(rawData.relay7, 0),
        relay8: this.parseNumber(rawData.relay8, 0),
        led1: this.parseNumber(rawData.led1, 0),
        led2: this.parseNumber(rawData.led2, 0),
        led3: this.parseNumber(rawData.led3, 0),
        led4: this.parseNumber(rawData.led4, 0),
        timestamp: Date.now()
      }

      // Update latest data cache
      this.latestData = deviceData

      // Log data summary (not full data to avoid log bloat)
      this.log('INFO', `Device data received - Temp: ${(deviceData.temperature / 10).toFixed(1)}°C, Humidity: ${(deviceData.humidity / 10).toFixed(1)}%`)

      // Notify all listeners
      this.dataListeners.forEach(listener => {
        try {
          listener(deviceData)
        } catch (error) {
          this.log('ERROR', `Error in data listener: ${error}`, error)
        }
      })

    } catch (error) {
      this.log('ERROR', `Failed to parse MQTT message: ${error}`, { 
        topic, 
        payload: payload.toString(),
        error 
      })
    }
  }

  /**
   * Parse number from raw data with fallback
   * 
   * @param {any} value - Raw value to parse
   * @param {number} defaultValue - Default value if parsing fails
   * @returns {number} Parsed number or default value
   */
  private parseNumber(value: any, defaultValue: number): number {
    const parsed = Number(value)
    return isNaN(parsed) ? defaultValue : parsed
  }

  /**
   * Log message with structured format
   * 
   * @param {string} level - Log level (INFO, WARN, ERROR)
   * @param {string} message - Log message
   * @param {any} data - Optional additional data
   */
  private log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any): void {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      component: 'MQTTService',
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
}
