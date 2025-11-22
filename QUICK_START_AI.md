# AI 助手快速入门

## 🚀 快速开始

### 1. 获取 API Key

#### OpenAI (推荐)
1. 访问 https://platform.openai.com/api-keys
2. 登录或注册账号
3. 点击 "Create new secret key"
4. 复制生成的 API Key（格式：sk-...）

#### 其他选择
- **Azure OpenAI**: 通过 Azure 门户获取
- **本地模型**: 使用 Ollama 或 LM Studio，无需 API Key

### 2. 配置 AI 助手

1. 打开数据看板页面
2. 找到 "莓界 AI 助手" 卡片
3. 点击右上角的 ⚙️ 设置按钮
4. 填写配置信息：

```
API Key: sk-your-api-key-here
API URL: https://api.openai.com/v1/chat/completions
模型: gpt-3.5-turbo
系统提示词: （使用默认或自定义）
```

5. 点击"保存设置"

### 3. 开始对话

在输入框中输入问题，例如：

```
当前温度22.8°C，湿度65.4%，这个环境适合草莓生长吗？
```

按 Enter 键发送，AI 助手会根据你的数据给出专业建议。

## 💡 使用技巧

### 提问技巧
1. **具体明确**: "土壤湿度30.2%是否需要浇水？" 比 "需要浇水吗？" 更好
2. **提供数据**: 引用看板上的实时数据，获得更准确的建议
3. **分步询问**: 复杂问题可以分成多个小问题

### 示例问题

#### 环境分析
```
根据当前的温度22.8°C、湿度65.4%和光照998lux，
请评估草莓的生长环境是否理想？
```

#### 病虫害诊断
```
病虫害率显示2.3%，这个水平需要采取什么措施？
```

#### 施肥建议
```
土壤氮含量45.3mg/kg，磷含量28.7mg/kg，钾含量156mg/kg，
请给出施肥建议。
```

#### 收获预测
```
成熟率已达87.6%，预计什么时候可以开始采收？
```

## 🔧 高级配置

### 使用本地模型（Ollama）

1. 安装 Ollama: https://ollama.ai
2. 下载模型: `ollama pull llama2`
3. 配置 AI 助手:
```
API Key: ollama (任意值)
API URL: http://localhost:11434/v1/chat/completions
模型: llama2
```

### 使用 Azure OpenAI

```
API Key: your-azure-api-key
API URL: https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT/chat/completions?api-version=2024-02-15-preview
模型: gpt-35-turbo (或你的部署名称)
```

### 自定义系统提示词

针对特定作物定制AI助手：

```
你是草莓种植专家，专注于：
- 温室环境控制
- 病虫害防治
- 水肥管理
- 产量优化

请根据传感器数据提供实用建议，
并在必要时给出具体的操作步骤。
```

## 📊 与数据看板集成

AI 助手可以帮你分析看板上的所有数据：

- 🌡️ 温度和湿度
- ☀️ 光照强度
- 💨 CO₂浓度
- 💧 土壤湿度
- 🌱 土壤肥力（NPK）
- 🐛 病虫害率
- 🍓 成熟率
- 🌧️ 降雨量

只需在对话中提到这些数据，AI 就能给出针对性的建议。

## ⚠️ 注意事项

1. **API 费用**: OpenAI API 按使用量计费，建议设置使用限额
2. **数据隐私**: API Key 存储在本地浏览器，不会上传到服务器
3. **网络要求**: 需要稳定的网络连接访问 API
4. **响应时间**: 首次响应可能需要几秒钟，请耐心等待

## 🆘 常见问题

**Q: 为什么提示"请先配置 AI API 密钥"？**
A: 需要先在设置中填写有效的 API Key。

**Q: API Key 安全吗？**
A: API Key 只存储在你的浏览器本地，不会发送到我们的服务器。

**Q: 可以使用免费的 AI 服务吗？**
A: 可以使用本地模型（Ollama）或其他提供免费额度的服务。

**Q: 对话历史会保存吗？**
A: 当前对话在页面刷新后会丢失，建议重要内容及时记录。

**Q: 可以同时使用多个模型吗？**
A: 目前只支持配置一个模型，可以随时在设置中切换。

## 📞 获取帮助

如有问题，请查看完整文档：`AI_ASSISTANT_README.md`

## 🌐 启用联网搜索（DashScope 兼容模式）

要让模型在需要时自动联网检索并给出“参考来源”，请按如下配置：

- 将 API URL 设置为：https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
- 模型：`qwen3-max`（或 `qwen3-max-2025-09-23`）

示例（Python OpenAI 兼容 SDK）：

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

completion = client.chat.completions.create(
    model="qwen3-max",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "杭州明天天气如何"},
    ],
    extra_body={"enable_search": True, "search_strategy": "agent"}
)

print(completion.choices[0].message.content)
```

界面中，答案将带有内联引用标注（如 `[1]`），并可在“参考来源”中展开查看具体来源、链接与引用片段。
