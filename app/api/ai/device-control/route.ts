/**
 * AI Device Control API
 * 
 * 允许 AI 助手控制设备
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, device, value, r, g, b } = body
    
    console.log('[AI Device Control] Received command:', JSON.stringify(body, null, 2))
    
    // 验证请求
    if (!action) {
      console.error('[AI Device Control] Missing action parameter')
      return NextResponse.json(
        { success: false, error: 'Missing action parameter' },
        { status: 400 }
      )
    }
    
    // 根据不同的 action 执行不同的控制
    if (action === 'toggle_relay') {
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
      
      // 调用 MQTT 控制 API
      const mqttPayload = {
        type: 'relay',
        relayNum: device,
        newState: value  // MQTT API 使用 newState 而不是 value
      }
      console.log('[AI Device Control] Calling MQTT API with:', mqttPayload)
      
      const response = await fetch(`${request.nextUrl.origin}/api/mqtt/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mqttPayload)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[AI Device Control] MQTT API error:', response.status, errorText)
        return NextResponse.json({
          success: false,
          error: `MQTT API returned ${response.status}: ${errorText}`
        }, { status: response.status })
      }
      
      const result = await response.json()
      console.log('[AI Device Control] MQTT API result:', result)
      return NextResponse.json(result)
      
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
      
      // 调用 MQTT 控制 API
      // MQTT API 使用 led1, led2, led3, led4 而不是 r, g, b, w
      const mqttPayload = {
        type: 'led',
        led1: r,  // 红色
        led2: g,  // 绿色
        led3: b,  // 蓝色
        led4: 0   // 白色（保留）
      }
      console.log('[AI Device Control] Calling MQTT API with:', mqttPayload)
      
      const response = await fetch(`${request.nextUrl.origin}/api/mqtt/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mqttPayload)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[AI Device Control] MQTT API error:', response.status, errorText)
        return NextResponse.json({
          success: false,
          error: `MQTT API returned ${response.status}: ${errorText}`
        }, { status: response.status })
      }
      
      const result = await response.json()
      console.log('[AI Device Control] MQTT API result:', result)
      return NextResponse.json(result)
      
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
