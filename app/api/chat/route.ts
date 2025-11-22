export async function GET() {
  return Response.json({
    message: "Chat API is working. Use POST to send messages.",
  })
}

import { getEnhancedSystemPrompt } from '@/lib/ai-system-prompt'

export async function POST(req: Request) {
  try {
    const { messages, apiKey, apiUrl, model, systemPrompt, enableSearch, deviceData, weatherData } =
      await req.json()

    if (!apiKey) {
      return Response.json(
        { error: "API Key is required. Please configure it in settings." },
        { status: 400 }
      )
    }
    
    // 构建增强的系统提示词，包含当前设备和天气数据
    const enhancedSystemPrompt = getEnhancedSystemPrompt(systemPrompt)
    
    // 格式化设备数据（将需要除以10的数据转换为正确的小数）
    const formattedDeviceData = deviceData ? {
      ...deviceData,
      temperature: deviceData.temperature ? (deviceData.temperature / 10).toFixed(1) + '°C' : null,
      humidity: deviceData.humidity ? (deviceData.humidity / 10).toFixed(1) + '%' : null,
      earth_temp: deviceData.earth_temp ? (deviceData.earth_temp / 10).toFixed(1) + '°C' : null,
      light: deviceData.light ? deviceData.light + ' lux' : null,
      co2: deviceData.co2 ? deviceData.co2 + ' ppm' : null,
      earth_water: deviceData.earth_water ? (deviceData.earth_water / 10).toFixed(1) + '%' : null,
      earth_ec: deviceData.earth_ec ? deviceData.earth_ec + ' μS/cm' : null,
      earth_n: deviceData.earth_n ? deviceData.earth_n + ' mg/kg' : null,
      earth_p: deviceData.earth_p ? deviceData.earth_p + ' mg/kg' : null,
      earth_k: deviceData.earth_k ? deviceData.earth_k + ' mg/kg' : null,
      relay5: deviceData.relay5 === 1 ? '开启（水泵）' : '关闭（水泵）',
      relay6: deviceData.relay6 === 1 ? '开启（风扇）' : '关闭（风扇）',
      relay7: deviceData.relay7 === 1 ? '开启（补光灯）' : '关闭（补光灯）',
      relay8: deviceData.relay8 === 1 ? '开启（白灯）' : '关闭（白灯）',
      led1: deviceData.led1 !== undefined ? `${deviceData.led1} (红色)` : null,
      led2: deviceData.led2 !== undefined ? `${deviceData.led2} (绿色)` : null,
      led3: deviceData.led3 !== undefined ? `${deviceData.led3} (蓝色)` : null,
      timestamp: deviceData.timestamp ? new Date(deviceData.timestamp).toLocaleString('zh-CN') : null
    } : null
    
    // 添加当前数据上下文
    let contextInfo = ''
    if (formattedDeviceData) {
      contextInfo += `\n\n## 当前设备数据\n\`\`\`json\n${JSON.stringify(formattedDeviceData, null, 2)}\n\`\`\`\n`
    }
    if (weatherData) {
      contextInfo += `\n\n## 当前天气信息\n\`\`\`json\n${JSON.stringify({
        location: weatherData.location?.name,
        temperature: weatherData.current?.temp_c,
        condition: weatherData.current?.condition?.text,
        humidity: weatherData.current?.humidity,
        forecast: weatherData.forecast?.forecastday?.slice(0, 3).map((day: any) => ({
          date: day.date,
          maxTemp: day.day.maxtemp_c,
          minTemp: day.day.mintemp_c,
          condition: day.day.condition.text,
          precipitation: day.day.totalprecip_mm
        }))
      }, null, 2)}\n\`\`\`\n`
    }
    
    const finalSystemPrompt = enhancedSystemPrompt + contextInfo

    const deviceControlInstruction =
      "## 设备控制能力\n" +
      "你可以通过生成 JSON 命令来控制设备。当你建议控制设备时：\n" +
      "1. 先分析当前数据和原因\n" +
      "2. 说明控制方案和预期效果\n" +
      "3. 生成控制命令 JSON（用代码块包裹）\n" +
      "4. 询问用户是否确认执行\n\n" +
      "控制命令格式：\n" +
      "```json\n" +
      "{\n" +
      '  "action": "toggle_relay",\n' +
      '  "device": 5,\n' +
      '  "value": 1\n' +
      "}\n" +
      "```\n" +
      "或\n" +
      "```json\n" +
      "{\n" +
      '  "action": "set_led",\n' +
      '  "r": 255,\n' +
      '  "g": 100,\n' +
      '  "b": 50\n' +
      "}\n" +
      "```\n"
    
    const citationInstruction =
      "关于引用来源的重要规则：\n" +
      "1. 只有在你确实知道真实存在的来源时，才使用 <SOURCES> 标签提供引用\n" +
      "2. 所有 url 必须是真实可访问的完整链接（含 http/https），绝对不能编造虚假网址\n" +
      "3. 如果你不确定具体来源或无法提供真实链接，请不要使用 <SOURCES> 标签\n" +
      "4. 宁可不提供来源，也不要编造虚假信息\n" +
      "5. 如果使用引用，在回复正文中使用 [n] 进行内联引用标注，并在回复末尾使用 <SOURCES> 与 </SOURCES> 包裹一个 JSON 数组\n" +
      "6. **重要：绝对不要在 Markdown 表格内使用 [n] 引用标记，这会破坏表格渲染。表格中的数据不需要引用标记。**\n" +
      "7. JSON 数组项必须包含：number、title、url、description、quote 字段\n" +
      "8. 不要在正文中直接展开 JSON"
    const reasoningInstruction =
      "在生成最终答案之前先输出你的思考过程，使用 <REASONING> 与 </REASONING> 包裹思考内容（中文、简洁）。该块用于前端展示并会从最终正文中移除。"
    const tasksInstruction =
      "如果在执行具体工作流程，请在回复末尾使用 <TASKS> 与 </TASKS> 包裹一个 JSON 数组，数组项包含 title、items、status。items 为对象数组，包含 type('text'|'file')、text 以及可选的 file{name, icon}。该块用于前端展示任务进度，并会从最终正文中移除。"
    const chartInstruction =
      "当需要返回可视化图表时，生成 Vega-Lite 规范的 JSON，并使用 <CHART type=\"vega-lite\"> 与 </CHART> 包裹；或返回 ECharts option 的 JSON，并使用 <CHART type=\"echarts\"> 与 </CHART> 包裹。只输出合法的 JSON，不要附加说明或代码块。"

    // 检测是否使用DashScope API
    const isDashScope =
      apiUrl?.includes("dashscope.aliyuncs.com") ||
      model?.startsWith("qwen")
    const isCompatibleMode = apiUrl?.includes("compatible-mode/v1") ?? false
    const isDashScopeAppCall = /\/api\/v1\/apps\/[^/]+\/completion(\?|$)/.test(apiUrl || "")

    let fullMessages
    let requestBody
    let targetUrl = apiUrl || ""

    if (isDashScopeAppCall) {
      const lastUser = ([...messages] as Array<{ role: string; content: string }>).reverse().find((m) => m?.role === "user")
      const promptText = `${finalSystemPrompt}\n\n${deviceControlInstruction}\n\n${reasoningInstruction}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}\n\n${String(lastUser?.content ?? "")}`
      fullMessages = messages
      requestBody = {
        input: { prompt: promptText },
        parameters: {},
        debug: {},
      }
      targetUrl = apiUrl
    } else if (isDashScope && isCompatibleMode) {
      // DashScope 兼容模式（OpenAI形状）
      // 规范URL，若为 /v1 结尾则补 /chat/completions
      if (/\/v1$/.test(targetUrl) && !/\/chat\/completions(\?|$)/.test(targetUrl)) {
        targetUrl = `${targetUrl}/chat/completions`
      }

      fullMessages = [
        {
          role: "system",
          content: `${finalSystemPrompt}\n\n${deviceControlInstruction}\n\n${reasoningInstruction}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}`,
        },
        ...messages,
      ]

      requestBody = {
        model: model || "qwen3-max",
        messages: fullMessages,
        stream: true,
        temperature: 0.7,
        ...(enableSearch ? { enable_search: true, search_strategy: "agent" } : {}),
      }
    } else if (isDashScope) {
      // DashScope 原生API格式
      const systemMessage = `${finalSystemPrompt}\n\n${deviceControlInstruction}\n\n${reasoningInstruction}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}`

      fullMessages = [
        { role: "system", content: systemMessage },
        ...messages,
      ]

      requestBody = {
        model: model || "qwen-turbo",
        input: {
          messages: fullMessages,
        },
        parameters: {
          result_format: "message",
          incremental_output: true,
        },
      }
    } else {
      // OpenAI兼容格式
      fullMessages = [
        {
          role: "system",
          content: `${finalSystemPrompt}\n\n${deviceControlInstruction}\n\n${reasoningInstruction}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}`,
        },
        ...messages,
      ]

      requestBody = {
        model: model || "gpt-3.5-turbo",
        messages: fullMessages,
        stream: true,
        temperature: 0.7,
      }
    }

    // 调用AI API
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (isDashScopeAppCall) {
      headers["Authorization"] = `Bearer ${apiKey}`
      // 尝试开启 SSE（若不支持，将回退为一次性输出）
      headers["X-DashScope-SSE"] = "enable"
    } else if (isDashScope && !isCompatibleMode) {
      headers["Authorization"] = `Bearer ${apiKey}`
      headers["X-DashScope-SSE"] = "enable"
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      return Response.json(
        { error: `API Error: ${response.status} - ${error}` },
        { status: response.status }
      )
    }

    if (isDashScopeAppCall) {
      // 兼容百炼应用调用的输出：优先处理 SSE，否则一次性输出转为 OpenAI SSE
      const isSSE = /text\/event-stream/i.test(response.headers.get("content-type") || "")
      const encoder = new TextEncoder()
      if (isSSE) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        const stream = new ReadableStream({
          async start(controller) {
            let acc = ""
            if (!reader) { controller.close(); return }
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split("\n")
                for (const line of lines) {
                  if (line.startsWith("data:")) {
                    const data = line.slice(5).trim()
                    if (data === "[DONE]") continue
                    try {
                      const json = JSON.parse(data)
                      const content =
                        json.output?.choices?.[0]?.message?.content ||
                        json.output?.text || ""
                      if (typeof content === "string") {
                        const next = content.slice(acc.length)
                        acc = content
                        if (next) {
                          const openaiFormat = {
                            id: json.request_id,
                            object: "chat.completion.chunk",
                            created: Date.now(),
                            model: model,
                            choices: [{ index: 0, delta: { content: next }, finish_reason: null }],
                          }
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`))
                        }
                      }
                    } catch {}
                  }
                }
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              controller.close()
            } catch (e) { controller.error(e instanceof Error ? e : new Error(String(e))) }
          }
        })
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }
        })
      } else {
        // 非SSE：读取完整JSON并封装为一次性OpenAI SSE
        const data = await response.json()
        const content: string = data?.output?.text || data?.output?.choices?.[0]?.message?.content || ""
        const payload = {
          id: data?.request_id || `${Date.now()}`,
          object: "chat.completion.chunk",
          created: Date.now(),
          model: model,
          choices: [{ index: 0, delta: { content }, finish_reason: "stop" }],
        }
        const body = `data: ${JSON.stringify(payload)}\n\ndata: [DONE]\n\n`
        return new Response(body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } })
      }
    } else if (isDashScope && !isCompatibleMode) {
      // DashScope返回SSE格式，需要转换
      const reader = response.body?.getReader()
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      const stream = new ReadableStream({
        async start(controller) {
          let acc = ""
          if (!reader) {
            controller.close()
            return
          }

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split("\n")

              for (const line of lines) {
                if (line.startsWith("data:")) {
                  const data = line.slice(5).trim()
                  if (data === "[DONE]") continue

                  try {
                    const json = JSON.parse(data)
                    const raw = json.output?.choices?.[0]?.message?.content || ""

                    if (typeof raw === "string") {
                      const next = raw.slice(acc.length)
                      acc = raw
                      if (next) {
                        // 转换为OpenAI格式的增量SSE
                        const openaiFormat = {
                          id: json.request_id,
                          object: "chat.completion.chunk",
                          created: Date.now(),
                          model: model,
                          choices: [
                            {
                              index: 0,
                              delta: { content: next },
                              finish_reason: json.output?.finish_reason || null,
                            },
                          ],
                        }
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`)
                        )
                      }
                    }
                  } catch (e) {
                    console.error("Parse error:", e)
                  }
                }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } else {
      // OpenAI格式直接返回
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Chat API Error:", error)
    return Response.json(
      { error: msg || "Internal server error" },
      { status: 500 }
    )
  }
}
