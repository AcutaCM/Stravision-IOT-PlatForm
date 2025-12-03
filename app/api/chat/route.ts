export const runtime = 'nodejs'

export async function GET() {
  return Response.json({
    message: "Chat API is working. Use POST to send messages.",
  })
}

import { getEnhancedSystemPrompt } from '@/lib/ai-system-prompt'
import { getAllTasks } from '@/lib/db/scheduler-service'
import { initDB } from '@/lib/db/database'

export async function POST(req: Request) {
  try {
    await initDB()
    const { messages, apiKey, apiUrl, model, systemPrompt, enableSearch, enableReasoning, deviceData, weatherData } =
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
      contextInfo += `\n\n## 当前设备数据（仅供分析，无需向用户直接展示JSON，请优先使用 <DEVICE_BENTO> 标签展示）\n\`\`\`json\n${JSON.stringify(formattedDeviceData, null, 2)}\n\`\`\`\n`
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

    // 注入当前定时任务列表
    try {
      const tasks = getAllTasks()
      const tasksContext = tasks.map(t => ({
        id: t.id,
        title: t.title,
        cron: t.cron_expression,
        execute_at: t.execute_at ? new Date(t.execute_at).toLocaleString('zh-CN') : null,
        action_type: t.action_type,
        device_id: t.device_id,
        active: t.is_active === 1
      }))
      
      contextInfo += `\n\n## 当前系统中的定时任务（这是真实的数据库记录，以此为准）\n\`\`\`json\n${JSON.stringify(tasksContext, null, 2)}\n\`\`\`\n`
    } catch (e) {
      console.error("Failed to fetch tasks for context:", e)
    }

    const finalSystemPrompt = enhancedSystemPrompt + contextInfo

    const deviceControlInstruction =
      "## 设备控制能力\n" +
      "你可以通过生成 JSON 命令来控制设备。但请注意：\n" +
      "1. 仅当用户明确要求控制设备，或当前环境数据严重异常需要紧急干预时，才建议控制设备。\n" +
      "2. 对于一般的种植建议、查询或闲聊，请使用自然语言回答，不要生成控制命令。\n" +
      "3. 当确实需要控制设备时：\n" +
      "   a. 先分析当前数据和原因\n" +
      "   b. 说明控制方案和预期效果\n" +
      "   c. 生成控制命令 JSON（用代码块包裹）\n" +
      "   d. 询问用户是否确认执行\n\n" +
      "控制命令格式：\n" +
      "```json\n" +
      "{\n" +
      '  "action": "toggle_relay",\n' +
      '  "device": 5,\n' +
      '  "value": 1\n' +
      "}\n" +
      "```\n" +
      "（value: 1 为开启，0 为关闭）\n" +
      "或关闭设备：\n" +
      "```json\n" +
      "{\n" +
      '  "action": "toggle_relay",\n' +
      '  "device": 5,\n' +
      '  "value": 0\n' +
      "}\n" +
      "```\n" +
      "或调节 LED：\n" +
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
    const monitorInstruction =
      "当用户询问监控、摄像头、直播流或想要查看实时画面时，请直接在回复中插入 <MONITOR></MONITOR> 标签（标签内不需要任何内容）。"
    const controlBentoInstruction = 
      "当用户要求查看设备控制、调节设备状态或你建议进行设备调控时，请在回复中包含 <CONTROL_BENTO></CONTROL_BENTO> 标签（标签内不需要任何内容）。然后，必须在标签之后简要说明你的调控建议或理由。如果用户明确表达了“是”、“确认”、“执行”等意图，或者你非常有把握需要执行某些操作，请务必同时输出 JSON 格式的控制命令，以便系统自动执行。"
    const taskListInstruction =
      "当用户要求查看、管理或删除定时任务列表时，请在回复中包含 <TASK_LIST></TASK_LIST> 标签（标签内不需要任何内容）。这将在前端渲染一个交互式的真实任务列表组件。重要：因为你已经输出了 <TASK_LIST> 标签，请不要再用文本重复列出任务内容，也不要描述“列表为空”或“包含X个任务”（除非你是在分析任务的合理性），因为你的文本描述可能与组件实时渲染的真实状态不一致。只需输出标签即可，让组件负责展示。"
    const bentoInstruction = 
      "当用户询问设备状态、环境数据、传感器读数或想要查看当前概况时，请直接在回复中插入 <DEVICE_BENTO></DEVICE_BENTO> 标签（标签内不需要任何内容）。然后，基于这些数据对当前环境状况进行简要的分析（例如：温湿度是否适宜，是否需要开启设备等）。请务必在 <DEVICE_BENTO> 标签之后输出分析内容，不要只输出标签。"
    const axisInstruction =
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
    const hasImageContent = Array.isArray(messages) && messages.some((m: any) => {
      const c = m?.content
      if (Array.isArray(c)) return c.some((x: any) => x?.type === "image_url" || x?.image_url || x?.image)
      return false
    })

    // 如果是DashScope且包含图片，强制使用兼容模式（因为Native API不支持Base64图片）
    let useCompatibleMode = isCompatibleMode
    if (isDashScope && hasImageContent && !isCompatibleMode) {
      useCompatibleMode = true
      targetUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    }

    const modelLower = String(model || '').toLowerCase()
    const isVLMModel = (
      modelLower.includes('vision') ||
      modelLower.includes('-vl-') ||
      /qwen\d*-vl/.test(modelLower) ||
      modelLower.includes('qvq')
    )
    let effectiveModel = model || ''
    if (hasImageContent) {
      if (!isVLMModel) {
        effectiveModel = 'qwen-vl-plus'
      } else if (useCompatibleMode && /qwen3-vl/.test(modelLower)) {
        effectiveModel = 'qwen-vl-plus'
      }
    }

    if (isDashScopeAppCall) {
      // ... existing app call logic ...
      const lastUser = ([...messages] as Array<{ role: string; content: string | any[] }>).reverse().find((m) => m?.role === "user")
      // ...
    } else if (isDashScope && useCompatibleMode) {
      // DashScope 兼容模式（OpenAI形状）
      // 规范URL，若为 /v1 结尾则补 /chat/completions
      if (/\/v1$/.test(targetUrl) && !/\/chat\/completions(\?|$)/.test(targetUrl)) {
        targetUrl = `${targetUrl}/chat/completions`
      }

      fullMessages = [
        {
          role: "system",
          content: `${finalSystemPrompt}\n\n${deviceControlInstruction}\n\n${enableReasoning ? reasoningInstruction : ""}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}\n\n${monitorInstruction}\n\n${bentoInstruction}\n\n${controlBentoInstruction}\n\n${taskListInstruction}\n\n${axisInstruction}`,
        },
        ...messages,
      ]

      requestBody = {
        model: effectiveModel || "qwen-plus",
        messages: fullMessages,
        stream: true,
        temperature: 0.7,
        ...(enableSearch ? { enable_search: true } : {}),
      }
    } else if (isDashScope) {
      // DashScope 原生API格式
      const systemMessage = `${finalSystemPrompt}\n\n${deviceControlInstruction}\n\n${enableReasoning ? reasoningInstruction : ""}\n\n${citationInstruction}\n\n${tasksInstruction}\n\n${chartInstruction}\n\n${monitorInstruction}\n\n${bentoInstruction}\n\n${controlBentoInstruction}\n\n${taskListInstruction}\n\n${axisInstruction}`

      // 转换消息格式：OpenAI format -> DashScope format
      // OpenAI: { type: "image_url", image_url: { url: "..." } } -> DashScope: { image: "..." }
      // OpenAI: { type: "text", text: "..." } -> DashScope: { text: "..." }
      const dashScopeMessages = messages.map((m: any) => {
        if (Array.isArray(m.content)) {
          return {
            role: m.role,
            content: m.content.map((c: any) => {
              if (c.type === 'image_url') return { image: c.image_url.url }
              if (c.type === 'text') return { text: c.text }
              return c
            })
          }
        }
        return m
      })

      fullMessages = [
        { role: "system", content: systemMessage },
        ...dashScopeMessages,
      ]

      requestBody = {
        model: effectiveModel || "qwen-plus",
        input: {
          messages: fullMessages,
        },
        parameters: {
          result_format: "message",
          incremental_output: true,
          ...(enableSearch ? { enable_search: true } : {}),
        },
      }
      if (hasImageContent && /\/aigc\/text-generation\//.test(targetUrl)) {
        targetUrl = targetUrl.replace("/aigc/text-generation/", "/aigc/multimodal-generation/")
      }
    } else {
      // ... OpenAI ...
    }

    // 调用AI API
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (isDashScopeAppCall) {
      headers["Authorization"] = `Bearer ${apiKey}`
      // 尝试开启 SSE（若不支持，将回退为一次性输出）
      headers["X-DashScope-SSE"] = "enable"
    } else if (isDashScope && !useCompatibleMode) {
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
                    } catch { }
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
    } else if (isDashScope && !useCompatibleMode) {
      // DashScope返回SSE格式，需要转换
      const reader = response.body?.getReader()
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      const stream = new ReadableStream({
        async start(controller) {
          let acc = ""
          let accReasoning = ""
          let reasoningClosed = false
          
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
                    
                    // Handle Search Citations
                    if (json.output?.choices?.[0]?.finish_reason === "stop" && json.output?.choices?.[0]?.message?.content) {
                       const searchInfo = json.output?.search_info
                       if (searchInfo && Array.isArray(searchInfo.search_results) && searchInfo.search_results.length > 0) {
                          const sources = searchInfo.search_results.map((item: any, idx: number) => ({
                             number: idx + 1,
                             title: item.title,
                             url: item.url,
                             description: item.snippet || "",
                             quote: ""
                          }))
                          
                          const sourcesTag = `\n\n<SOURCES> ${JSON.stringify(sources)} </SOURCES>`
                          const openaiFormat = {
                            id: json.request_id,
                            object: "chat.completion.chunk",
                            created: Date.now(),
                            model: model,
                            choices: [{ index: 0, delta: { content: sourcesTag }, finish_reason: null }]
                          }
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`))
                       }
                    }

                    // Handle Reasoning Content (DeepSeek-R1 style via DashScope)
                    // DashScope returns accumulated reasoning_content
                    const rawReasoning = json.output?.choices?.[0]?.message?.reasoning_content || ""
                    if (typeof rawReasoning === "string" && rawReasoning.length > 0) {
                      const nextReasoning = rawReasoning.slice(accReasoning.length)
                      if (nextReasoning) {
                        // If this is the start of reasoning, prepend <REASONING>
                        const prefix = accReasoning.length === 0 ? "<REASONING>" : ""
                        accReasoning = rawReasoning
                        
                        const openaiFormat = {
                          id: json.request_id,
                          object: "chat.completion.chunk",
                          created: Date.now(),
                          model: model,
                          choices: [{ 
                            index: 0, 
                            delta: { content: prefix + nextReasoning }, 
                            finish_reason: null 
                          }]
                        }
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`))
                      }
                    }

                    const raw = json.output?.choices?.[0]?.message?.content || ""

                    if (typeof raw === "string") {
                      const next = raw.slice(acc.length)
                      acc = raw
                      if (next) {
                        // If we were reasoning and haven't closed it, close it now
                        let prefix = ""
                        if (accReasoning.length > 0 && !reasoningClosed) {
                           prefix = "</REASONING>\n\n"
                           reasoningClosed = true
                        }

                        const openaiFormat = {
                          id: json.request_id,
                          object: "chat.completion.chunk",
                          created: Date.now(),
                          model: model,
                          choices: [
                            {
                              index: 0,
                              delta: { content: prefix + next },
                              finish_reason: json.output?.finish_reason || null,
                            },
                          ],
                        }
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`)
                        )
                      }
                    }
                    
                    // If finished and reasoning still open, close it
                    if (json.output?.finish_reason === "stop" && accReasoning.length > 0 && !reasoningClosed) {
                       const openaiFormat = {
                          id: json.request_id,
                          object: "chat.completion.chunk",
                          created: Date.now(),
                          model: model,
                          choices: [{ index: 0, delta: { content: "</REASONING>\n\n" }, finish_reason: null }]
                       }
                       controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`))
                       reasoningClosed = true
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
