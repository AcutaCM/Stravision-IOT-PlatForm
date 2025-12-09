import { NextResponse } from 'next/server'
import { sendWeComNotification } from '@/lib/notification-service'

export async function POST() {
  try {
    await sendWeComNotification(
      `# 🔔 推送测试\n\n这是一条来自 Stravision IoT 平台的测试通知。\n\n> 时间: ${new Date().toLocaleString('zh-CN')}\n> 状态: ✅ 正常`,
      'markdown'
    )
    return NextResponse.json({ success: true, message: 'Notification sent' })
  } catch (error) {
    console.error('Push test error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
