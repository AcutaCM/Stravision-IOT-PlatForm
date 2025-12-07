/**
 * AI Device Control API
 * 
 * 允许 AI 助手控制设备
 */

import { NextRequest, NextResponse } from 'next/server'
import { MQTTService } from '@/lib/mqtt-service'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication Check
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    let { action, device, value, r, g, b } = body
    
    console.log('[AI Device Control] Received command:', JSON.stringify(body, null, 2))
    
    // 验证请求
    if (!action) {
      console.error('[AI Device Control] Missing action parameter')
      return NextResponse.json(
        { success: false, error: 'Missing action parameter' },
        { status: 400 }
      )
    }
    
    const mqttService = MQTTService.getInstance()
    
    // Ensure MQTT connected
    if (!mqttService.isConnected()) {
      try {
        await mqttService.connect()
      } catch (e) {
        return NextResponse.json({ success: false, error: 'MQTT Connection Failed' }, { status: 503 })
      }
    }

    // 根据不同的 action 执行不同的控制
    if (action === 'toggle_relay') {
      // 规范化 value 值，兼容 boolean 和 string
      if (typeof value === 'boolean') {
        value = value ? 1 : 0
      } else if (typeof value === 'string') {
        const v = value.toLowerCase()
        if (v === '1' || v === 'true' || v === 'on') value = 1
        else if (v === '0' || v === 'false' || v === 'off') value = 0
      }

      if (device === undefined || device === null || (value !== 0 && value !== 1)) {
        return NextResponse.json(
          { success: false, error: `Invalid device (${device}) or value (${value}) for toggle_relay. Device must be 5-8, value must be 0 or 1.` },
          { status: 400 }
        )
      }
      
      // 验证设备编号范围
      if (device < 5 || device > 8) {
        return NextResponse.json(
          { success: false, error: `Invalid device number: ${device}. Must be between 5 and 8.` },
          { status: 400 }
        )
      }
      
      // 直接调用 MQTT Service，不再通过 API
      const mqttPayload = {
        type: 'relay' as const,
        relayNum: device,
        newState: value
      }
      console.log('[AI Device Control] Calling MQTT Service with:', mqttPayload)
      
      await mqttService.sendControlCommand(mqttPayload)
      
      return NextResponse.json({
        success: true,
        message: 'Control command sent successfully',
        timestamp: Date.now()
      })
      
    } else if (action === 'set_led') {
      if (r === undefined || g === undefined || b === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing RGB values for set_led' },
          { status: 400 }
        )
      }
      
      // 验证 RGB 值范围
      if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        return NextResponse.json(
          { success: false, error: 'RGB values must be between 0 and 255' },
          { status: 400 }
        )
      }
      
      // 直接调用 MQTT Service
      const mqttPayload = {
        type: 'led' as const,
        led1: r,  // 红色
        led2: g,  // 绿色
        led3: b,  // 蓝色
        led4: 0   // 白色（保留）
      }
      console.log('[AI Device Control] Calling MQTT Service with:', mqttPayload)
      
      await mqttService.sendControlCommand(mqttPayload)
      
      return NextResponse.json({
        success: true,
        message: 'Control command sent successfully',
        timestamp: Date.now()
      })
      
    } else {
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('[AI Device Control] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// 返回可用的控制命令说明
export async function GET() {
  return NextResponse.json({
    availableActions: {
      toggle_relay: {
        description: "开关继电器设备",
        parameters: {
          action: "toggle_relay",
          device: "继电器编号 (5=水泵, 6=风扇, 7=补光灯, 8=白灯)",
          value: "状态值 (0=关闭, 1=开启)"
        },
        example: {
          action: "toggle_relay",
          device: 5,
          value: 1
        }
      },
      set_led: {
        description: "设置 RGB LED 补光灯颜色",
        parameters: {
          action: "set_led",
          r: "红色值 (0-255)",
          g: "绿色值 (0-255)",
          b: "蓝色值 (0-255)"
        },
        example: {
          action: "set_led",
          r: 255,
          g: 100,
          b: 50
        }
      }
    }
  })
}
