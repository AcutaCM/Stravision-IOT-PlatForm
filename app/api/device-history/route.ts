import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type')
    const range = searchParams.get('range') || '1h'

    if (!type) {
        return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 })
    }

    // Generate mock data based on range
    const now = Date.now()
    const data = []
    let points = 20
    let interval = 0
    let startTime = 0

    switch (range) {
        case '1h':
            points = 12 // Every 5 mins
            interval = 5 * 60 * 1000
            startTime = now - 60 * 60 * 1000
            break
        case '1d':
            points = 24 // Every hour
            interval = 60 * 60 * 1000
            startTime = now - 24 * 60 * 60 * 1000
            break
        case '7d':
            points = 7 // Every day
            interval = 24 * 60 * 60 * 1000
            startTime = now - 7 * 24 * 60 * 60 * 1000
            break
        default:
            points = 12
            interval = 5 * 60 * 1000
            startTime = now - 60 * 60 * 1000
    }

    // Base values for different types
    let baseValue = 0
    let variance = 0

    switch (type) {
        case 'temperature':
            baseValue = 25
            variance = 5
            break
        case 'humidity':
            baseValue = 60
            variance = 10
            break
        case 'light':
            baseValue = 5000
            variance = 2000
            break
        case 'co2':
            baseValue = 400
            variance = 50
            break
        case 'soilMoisture':
            baseValue = 45
            variance = 5
            break
        case 'fertility':
            baseValue = 150
            variance = 20
            break
        case 'nitrogen':
            baseValue = 100
            variance = 10
            break
        case 'phosphorus':
            baseValue = 50
            variance = 5
            break
        case 'potassium':
            baseValue = 120
            variance = 15
            break
        default:
            baseValue = 50
            variance = 10
    }

    for (let i = 0; i < points; i++) {
        const timestamp = startTime + i * interval
        // Add some randomness and sine wave for realism
        const timeFactor = Math.sin(i / points * Math.PI * 2) * (variance / 2)
        const randomFactor = (Math.random() - 0.5) * (variance / 2)

        let value = baseValue + timeFactor + randomFactor

        // Ensure positive values for physical quantities
        value = Math.max(0, value)

        // Round to 1 decimal place
        value = Math.round(value * 10) / 10

        data.push({
            timestamp,
            value
        })
    }

    return NextResponse.json({
        success: true,
        data
    })
}
