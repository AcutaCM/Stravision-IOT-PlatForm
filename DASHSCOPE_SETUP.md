# 阿里云 DashScope API 配置指南

## 概述
系统现已支持阿里云 DashScope API（通义千问），推荐国内用户使用以获得更好的访问速度和稳定性。

## 获取 API Key

### 1. 注册阿里云账号
访问 [阿里云官网](https://www.aliyun.com/) 注册账号

### 2. 开通 DashScope 服务
1. 访问 [DashScope 控制台](https://dashscope.console.aliyun.com/)
2. 开通"模型服务灵积"服务
3. 新用户通常有免费额度

### 3. 获取 API Key
1. 在 DashScope 控制台点击"API-KEY管理"
2. 创建新的 API Key
3. 复制生成的 API Key（格式类似：sk-xxxxxxxxxxxxxx）

## 配置步骤

### 1. 打开 AI 助手设置
在应用右上角点击设置图标

### 2. 选择 API 类型
点击"阿里云 DashScope"按钮，系统会自动填充：
- API URL: `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`
- 模型: `qwen-turbo`

### 3. 输入 API Key
将从 DashScope 控制台获取的 API Key 粘贴到"API Key"输入框

### 4. 选择模型（可选）
可用的模型包括：
- **qwen-turbo** - 快速响应，适合日常对话（推荐）
- **qwen-plus** - 更强大的理解能力
- **qwen-max** - 最强性能，适合复杂任务
- **qwen-long** - 支持超长文本

### 5. 自定义系统提示词（可选）
默认提示词已针对农业场景优化，可根据需要修改

### 6. 保存设置
点击"保存设置"按钮

## 功能特性

### 自动检测
系统会自动检测 API 类型：
- 如果 URL 包含 `dashscope.aliyuncs.com`
- 或者模型名称以 `qwen` 开头
- 将自动使用 DashScope API 格式

### 流式响应
支持流式输出，实时显示 AI 回复内容

### 格式转换
系统自动将 DashScope 的 SSE 格式转换为标准格式，前端无需修改

## OpenAI 兼容模式

如果需要使用 OpenAI 或其他兼容服务：

1. 点击"OpenAI"按钮
2. 输入相应的 API URL 和 API Key
3. 选择对应的模型

支持的服务包括：
- OpenAI 官方 API
- Azure OpenAI
- 其他 OpenAI 兼容的 API 服务

## 联网搜索（enable_search）

DashScope 在 OpenAI 兼容模式下支持联网搜索能力，通过请求体添加 `enable_search: true` 开启。建议配合 `search_strategy: "agent"` 使用。

### 支持的模型与区域
- 中国大陆（北京）与国际（新加坡）
- 仅支持 `qwen3-max`、`qwen3-max-2025-09-23`

### 兼容模式 Chat Completions URL
- `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`

### Python SDK（OpenAI 兼容）示例
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

### Node.js SDK（OpenAI 兼容）示例
```js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

const res = await client.chat.completions.create({
  model: "qwen3-max",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "杭州明天天气如何" },
  ],
  enable_search: true,
  search_strategy: "agent",
});

console.log(res.choices[0].message.content);
```

### 后端直连（本项目）
当前项目在将 API URL 设置为 `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` 且模型为 `qwen3-max` 时，会在请求体中自动加入 `enable_search: true` 与 `search_strategy: "agent"` 以开启联网搜索，并在界面中展示回答内的参考来源。

## 价格参考

### DashScope 定价（参考）
- qwen-turbo: 约 ¥0.008/千tokens
- qwen-plus: 约 ¥0.02/千tokens
- qwen-max: 约 ¥0.12/千tokens

新用户通常有免费额度，具体以阿里云官网为准。

## 故障排查

### API Key 错误
- 确认 API Key 格式正确
- 检查 API Key 是否已激活
- 确认账户余额充足

### 连接超时
- 检查网络连接
- 确认 API URL 正确
- 尝试切换网络环境

### 模型不可用
- 确认选择的模型已开通
- 检查账户权限
- 尝试使用 qwen-turbo（基础模型）

## 技术实现

### API 格式差异
DashScope 使用不同的请求格式：

```json
{
  "model": "qwen-turbo",
  "input": {
    "messages": [...]
  },
  "parameters": {
    "result_format": "message",
    "incremental_output": true
  }
}
```

系统会自动处理格式转换，开发者无需关心底层实现。

### SSE 流式响应
DashScope 返回的 SSE 格式会被自动转换为 OpenAI 兼容格式，确保前端代码统一。

## 相关链接

- [DashScope 官方文档](https://help.aliyun.com/zh/dashscope/)
- [通义千问模型介绍](https://help.aliyun.com/zh/dashscope/developer-reference/model-introduction)
- [API 参考文档](https://help.aliyun.com/zh/dashscope/developer-reference/api-details)
- [价格说明](https://help.aliyun.com/zh/dashscope/developer-reference/tongyi-thousand-questions-metering-and-billing)

## 注意事项

1. **API Key 安全**：不要将 API Key 提交到代码仓库
2. **使用限制**：注意 API 调用频率限制
3. **成本控制**：监控 API 使用量，避免超出预算
4. **数据隐私**：敏感数据请谨慎使用 AI 服务
