import { getDB, initDB } from "./database"

export interface SensorData {
  temperature: number
  humidity: number
  light: number
  co2: number
  soil_moisture: number
  earth_n: number
  earth_p: number
  earth_k: number
  rainfall: number
}

export interface SensorReading extends SensorData {
  id: number
  device_id: string
  created_at: number
}

/**
 * 保存传感器读数
 */
export async function saveSensorReading(data: SensorData) {
  await initDB()
  const db = getDB()
  
  const stmt = db.prepare(`
    INSERT INTO sensor_readings (
      temperature, humidity, light, co2, 
      soil_moisture, earth_n, earth_p, earth_k, rainfall, 
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  
  stmt.run(
    data.temperature,
    data.humidity,
    data.light,
    data.co2,
    data.soil_moisture,
    data.earth_n,
    data.earth_p,
    data.earth_k,
    data.rainfall,
    Date.now()
  )
}

/**
 * 获取传感器历史数据
 * @param type 数据类型 (temperature, humidity, etc.)
 * @param range 时间范围 (1h, 1d, 7d)
 */
export async function getSensorHistory(type: string, range: string) {
  await initDB()
  const db = getDB()
  
  let startTime = Date.now()
  let interval = 0 // 聚合间隔（秒），0表示不聚合
  
  switch (range) {
    case '1h':
      startTime -= 60 * 60 * 1000
      break
    case '1d':
      startTime -= 24 * 60 * 60 * 1000
      interval = 30 * 60 // 30分钟聚合一次
      break
    case '7d':
      startTime -= 7 * 24 * 60 * 60 * 1000
      interval = 4 * 60 * 60 // 4小时聚合一次
      break
    default:
      startTime -= 60 * 60 * 1000
  }

  // 映射前端字段名到数据库列名
  const colMap: Record<string, string> = {
    'temperature': 'temperature',
    'humidity': 'humidity',
    'light': 'light',
    'co2': 'co2',
    'soilMoisture': 'soil_moisture',
    'fertility': 'earth_n', // 特殊处理，稍后计算
    'nitrogen': 'earth_n',
    'phosphorus': 'earth_p',
    'potassium': 'earth_k',
    'rainfall': 'rainfall'
  }

  const col = colMap[type] || type
  
  // 如果是 fertility，需要取 NPK 三个字段来计算
  if (type === 'fertility') {
    const rows = db.prepare(`
      SELECT created_at as timestamp, earth_n, earth_p, earth_k 
      FROM sensor_readings 
      WHERE created_at > ? 
      ORDER BY created_at ASC
    `).all(startTime) as any[]
    
    // 降采样
    const filteredRows = downsample(rows, interval)
    
    return filteredRows.map(row => {
      // N: 0-200 -> 0-100%
      const nScore = Math.min(100, (row.earth_n / 200) * 100)
      // P: 0-100 -> 0-100%
      const pScore = Math.min(100, (row.earth_p / 100) * 100)
      // K: 0-300 -> 0-100%
      const kScore = Math.min(100, (row.earth_k / 300) * 100)
      const fertility = (nScore + pScore + kScore) / 3
      return {
        timestamp: row.timestamp,
        value: Number(fertility.toFixed(1))
      }
    })
  }

  // 常规查询
  const query = `
    SELECT created_at as timestamp, ${col} as value
    FROM sensor_readings 
    WHERE created_at > ? 
    ORDER BY created_at ASC
  `
  
  const rows = db.prepare(query).all(startTime) as { timestamp: number, value: number }[]
  
  return downsample(rows, interval)
}

// 简单的降采样/抽稀函数
function downsample(data: any[], intervalSeconds: number) {
  if (intervalSeconds <= 0 || data.length < 50) return data
  
  const result = []
  let lastTime = 0
  
  for (const item of data) {
    if (item.timestamp - lastTime >= intervalSeconds * 1000) {
      result.push(item)
      lastTime = item.timestamp
    }
  }
  
  return result
}

/**
 * 清理旧的传感器数据 (保留最近7天)
 */
export async function cleanupOldSensorData() {
  await initDB()
  const db = getDB()
  
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  
  const result = db.prepare('DELETE FROM sensor_readings WHERE created_at < ?').run(sevenDaysAgo)
  
  if (result.changes > 0) {
    console.log(`[System] Cleaned up ${result.changes} old sensor records.`)
  }
}

/**
 * 检查并初始化模拟历史数据 (如果表为空)
 */
export async function initSensorDataIfNeeded() {
  await initDB()
  const db = getDB()
  
  const count = db.prepare('SELECT count(*) as count FROM sensor_readings').get() as { count: number }
  
  if (count.count > 0) return // 已有数据
  
  console.log("Seeding sensor data...")
  
  const now = Date.now()
  const days = 7
  const interval = 10 * 60 * 1000 // 10分钟一个点
  const points = (days * 24 * 60 * 60 * 1000) / interval
  
  const insert = db.prepare(`
    INSERT INTO sensor_readings (
      temperature, humidity, light, co2, 
      soil_moisture, earth_n, earth_p, earth_k, rainfall, 
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  
  // 初始值
  let temp = 25
  let hum = 60
  let light = 0
  let co2 = 400
  let soil = 45
  let n = 100
  let p = 50
  let k = 120
  
  const transaction = db.transaction(() => {
    for (let i = points; i >= 0; i--) {
      const time = now - i * interval
      const date = new Date(time)
      const hour = date.getHours()
      
      // 模拟日夜变化
      const isDay = hour >= 6 && hour <= 18
      
      // 温度: 白天高，晚上低，带随机波动
      const targetTemp = isDay ? 28 : 18
      temp += (targetTemp - temp) * 0.1 + (Math.random() - 0.5) * 1
      
      // 湿度: 晚上高，白天低
      const targetHum = isDay ? 45 : 75
      hum += (targetHum - hum) * 0.1 + (Math.random() - 0.5) * 2
      
      // 光照: 白天有光，正午最高
      if (isDay) {
        // 简单的正弦波模拟太阳高度
        const hourOffset = hour - 6 // 0 to 12
        const intensity = Math.sin((hourOffset / 12) * Math.PI) 
        light = intensity * 50000 + (Math.random() * 5000)
      } else {
        light = 0
      }
      
      // CO2: 白天植物消耗低，晚上积累高
      const targetCo2 = isDay ? 380 : 450
      co2 += (targetCo2 - co2) * 0.1 + (Math.random() - 0.5) * 5
      
      // 土壤: 变化缓慢
      soil += (Math.random() - 0.5) * 0.5
      n += (Math.random() - 0.5) * 0.2
      p += (Math.random() - 0.5) * 0.1
      k += (Math.random() - 0.5) * 0.3
      
      // 降雨: 随机发生
      const rainfall = Math.random() > 0.98 ? Math.random() * 5 : 0
      if (rainfall > 0) {
          soil += 2 // 下雨增加土壤湿度
      }
      // 土壤湿度自然蒸发
      soil -= 0.05 
      if (soil < 20) soil = 20
      if (soil > 90) soil = 90
      
      insert.run(
        temp, hum, Math.max(0, light), co2, 
        soil, n, p, k, rainfall,
        time
      )
    }
  })
  
  transaction()
  console.log("Seeding complete.")
}
