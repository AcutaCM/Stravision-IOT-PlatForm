# AI 助手功能说明

## 功能概述

莓界智慧农业平台集成了AI助手功能，可以帮助用户分析农业数据、提供种植建议和解答农业相关问题。

## 功能特性

### 1. API 配置
- 支持 OpenAI 及兼容的 API 端点
- 可自定义 API Key、API URL 和模型
- 可配置系统提示词，定制AI助手的行为

### 2. 实时对话
- 流式响应，实时显示AI回复
- 支持多轮对话，保持上下文
- Enter 键快速发送消息（Shift+Enter 换行）

### 3. 用户体验
- 消息自动滚动到最新
- 加载状态指示
- 消息计数显示
- 响应式设计

## 使用步骤

### 第一步：配置 API

1. 点击 AI 助手卡片右上角的设置图标（⚙️）
2. 在弹出的对话框中填写以下信息：
   - **API Key**: 你的 OpenAI API 密钥（格式：sk-...）
   - **API URL**: API 端点地址（默认：https://api.openai.com/v1/chat/completions）
   - **模型**: 使用的模型名称（默认：gpt-3.5-turbo）
   - **系统提示词**: 定制AI助手的角色和行为
3. 点击"保存设置"

### 第二步：开始对话

1. 在输入框中输入你的问题
2. 按 Enter 键或点击发送按钮（↑）
3. 等待 AI 助手回复

## API 兼容性

本系统支持以下 API 提供商：

### OpenAI
```
API URL: https://api.openai.com/v1/chat/completions
模型: gpt-3.5-turbo, gpt-4, gpt-4-turbo 等
```

### Azure OpenAI
```
API URL: https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT/chat/completions?api-version=2024-02-15-preview
需要在请求头中添加 api-key
```

### 其他兼容服务
任何支持 OpenAI Chat Completions API 格式的服务都可以使用，例如：
- Anthropic Claude (通过代理)
- 本地部署的 LLM (如 Ollama、LM Studio)
- 国内大模型服务（如智谱、通义千问等，需要使用兼容层）

## 系统提示词示例

### 默认提示词
```
你是莓界智慧农业平台的AI助手，专门帮助用户分析农业数据、提供种植建议和解答农业相关问题。请用专业但易懂的语言回答问题。
```

### 自定义示例
```
你是一位资深的草莓种植专家，拥有20年的种植经验。你擅长：
1. 分析环境数据（温度、湿度、光照等）
2. 诊断病虫害问题
3. 提供施肥和灌溉建议
4. 预测产量和成熟时间

请根据用户提供的数据和问题，给出专业、详细且可操作的建议。
```

## 数据隐私

- 所有 API 配置信息存储在浏览器本地（localStorage）
- API Key 不会发送到我们的服务器
- 对话内容通过我们的服务器转发到你配置的 API 端点
- 建议使用具有适当权限限制的 API Key

## 故障排除

### 问题：提示"请先配置 AI API 密钥"
**解决方案**: 点击设置按钮，填写有效的 API Key

### 问题：API 请求失败
**可能原因**:
1. API Key 无效或已过期
2. API URL 配置错误
3. 网络连接问题
4. API 配额已用完

**解决方案**: 检查 API 配置，确认 API Key 有效且有足够配额

### 问题：响应速度慢
**可能原因**:
1. 使用的模型较大（如 GPT-4）
2. 网络延迟
3. API 服务器负载高

**解决方案**: 
- 尝试使用更快的模型（如 gpt-3.5-turbo）
- 检查网络连接
- 稍后重试

## 技术实现

### 前端
- React + TypeScript
- 流式响应处理
- localStorage 持久化配置

### 后端
- Next.js API Routes (Edge Runtime)
- 流式转发 AI 响应
- 支持 OpenAI 兼容 API

### 安全性
- API Key 仅在客户端存储
- 使用 HTTPS 加密传输
- 支持自定义 API 端点

## 未来计划

- [ ] 支持文件上传（图片识别）
- [ ] 对话历史导出
- [ ] 多语言支持
- [ ] 语音输入/输出
- [ ] 预设问题模板
- [ ] 数据可视化集成

## 参考来源与联网搜索

### 参考来源展示
- AI 回答中会使用内联引用标注（如 `[1]`）指示对应来源。
- 消息底部提供“参考来源”列表，包含标题、链接、摘要与引用片段，便于核实。
- 内部协议：回答末尾会附带 `<SOURCES>...</SOURCES>` 的 JSON 数据，前端解析并呈现。

### 开启联网搜索
- 将 API URL 设置为 `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`。
- 模型选择 `qwen3-max`（或 `qwen3-max-2025-09-23`）。
- 请求体包含联网搜索参数：
  - `enable_search: true`
  - `search_strategy: "agent"`

本项目在上述兼容模式下会自动添加上述参数，以便模型在需要时主动检索外部资料并返回可核查的参考来源。
