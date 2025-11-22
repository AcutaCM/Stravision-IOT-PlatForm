# 修复 /api/chat 404 错误

## 问题
POST /api/chat 返回 404 错误，但路由文件 `app/api/chat/route.ts` 存在且代码正确。

## 原因
这是 Next.js 开发服务器缓存问题。当 API 路由文件被创建或修改后，开发服务器可能没有正确识别新的路由。

## 解决方案

### 方法 1: 使用提供的批处理脚本（推荐）
1. 运行 `restart-dev.bat` 脚本
   - 这会停止所有 Node 进程
   - 删除 `.next` 缓存目录
   - 重新启动开发服务器

### 方法 2: 手动重启
1. 停止当前的开发服务器（Ctrl+C）
2. 删除 `.next` 目录：
   ```cmd
   rmdir /s /q .next
   ```
3. 重新启动开发服务器：
   ```cmd
   npm run dev
   ```

### 方法 3: 如果方法1和2都不行
1. 停止所有 Node 进程：
   ```cmd
   taskkill /F /IM node.exe
   ```
2. 删除 `.next` 目录
3. 清除 npm 缓存（可选）：
   ```cmd
   npm cache clean --force
   ```
4. 重新安装依赖（如果需要）：
   ```cmd
   npm install
   ```
5. 启动开发服务器：
   ```cmd
   npm run dev
   ```

## 验证
重启后，访问以下URL验证：
- http://localhost:3000/api/test - 应该返回 `{"message": "Test route works!"}`
- POST 请求到 http://localhost:3000/api/chat - 应该正常工作

## 注意事项
- 确保只有一个开发服务器实例在运行
- 如果问题持续存在，检查端口 3000 是否被其他进程占用
- 检查控制台是否有其他错误信息
