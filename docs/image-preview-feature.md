# AI 助手图片预览功能

## 功能说明

AI 助手回复中的图片现在可以点击放大预览，提供更好的查看体验。

## 实现方式

### 1. 状态管理

```typescript
const [previewImage, setPreviewImage] = useState<string | null>(null)
```

- `previewImage`: 存储当前预览的图片 URL
- `null` 表示没有图片在预览中

### 2. 自定义图片渲染

使用 ReactMarkdown 的 `components` 属性自定义图片渲染：

```typescript
<ReactMarkdown 
  remarkPlugins={[remarkGfm]}
  components={{
    img: ({node, ...props}) => (
      <img 
        {...props} 
        className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setPreviewImage(typeof props.src === 'string' ? props.src : '')}
        alt={props.alt || ''}
      />
    )
  }}
>
  {content}
</ReactMarkdown>
```

**特点**:
- `cursor-pointer`: 鼠标悬停显示手型光标
- `hover:opacity-80`: 悬停时半透明效果，提示可点击
- `rounded-lg`: 圆角边框
- `max-w-full h-auto`: 响应式尺寸

### 3. 预览模态框

```tsx
{previewImage && (
  <div 
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    onClick={() => setPreviewImage(null)}
  >
    <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
      <img 
        src={previewImage} 
        alt="Preview" 
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={() => setPreviewImage(null)}
        className="absolute top-4 right-4 size-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white flex items-center justify-center transition-all"
      >
        ✕
      </button>
    </div>
  </div>
)}
```

## 用户体验

### 打开预览

```
用户点击图片
    ↓
setPreviewImage(imageUrl)
    ↓
显示全屏模态框
    ↓
图片居中显示，最大化利用屏幕空间
```

### 关闭预览

**方式 1**: 点击背景
```
用户点击黑色背景
    ↓
onClick={() => setPreviewImage(null)}
    ↓
关闭模态框
```

**方式 2**: 点击关闭按钮
```
用户点击右上角 ✕ 按钮
    ↓
onClick={() => setPreviewImage(null)}
    ↓
关闭模态框
```

## 样式设计

### 图片缩略图（聊天中）

```css
max-w-full        /* 最大宽度 100% */
h-auto            /* 高度自适应 */
rounded-lg        /* 圆角 */
cursor-pointer    /* 手型光标 */
hover:opacity-80  /* 悬停半透明 */
transition-opacity /* 平滑过渡 */
```

### 预览模态框

```css
fixed inset-0              /* 全屏覆盖 */
z-50                       /* 最高层级 */
bg-black/80                /* 半透明黑色背景 */
backdrop-blur-sm           /* 背景模糊 */
flex items-center justify-center /* 居中对齐 */
```

### 预览图片

```css
max-w-full max-h-full  /* 适应屏幕 */
object-contain         /* 保持宽高比 */
rounded-lg             /* 圆角 */
shadow-2xl             /* 大阴影 */
```

### 关闭按钮

```css
absolute top-4 right-4     /* 右上角定位 */
size-10                    /* 40x40px */
rounded-full               /* 圆形 */
bg-white/10                /* 半透明白色 */
hover:bg-white/20          /* 悬停更亮 */
backdrop-blur-sm           /* 背景模糊 */
```

## 响应式设计

### 桌面端

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         ┌─────────────────┐         │
│         │                 │         │
│         │   预览图片       │         │
│         │                 │         │
│         └─────────────────┘         │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

### 移动端

```
┌───────────────┐
│               │
│  ┌─────────┐  │
│  │         │  │
│  │ 预览图片 │  │
│  │         │  │
│  └─────────┘  │
│               │
└───────────────┘
```

## 交互细节

### 1. 点击图片

- **视觉反馈**: 悬停时透明度降低到 80%
- **光标变化**: 显示手型光标
- **动画**: 平滑的透明度过渡

### 2. 打开预览

- **背景**: 黑色半透明 + 模糊效果
- **图片**: 平滑淡入
- **居中**: 自动居中显示

### 3. 关闭预览

- **点击背景**: 任意位置点击即可关闭
- **点击按钮**: 右上角 ✕ 按钮
- **阻止冒泡**: 点击图片本身不会关闭

## 代码示例

### 完整的图片渲染组件

```typescript
components={{
  img: ({node, ...props}) => (
    <img 
      {...props} 
      className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => setPreviewImage(typeof props.src === 'string' ? props.src : '')}
      alt={props.alt || ''}
    />
  )
}}
```

### 完整的预览模态框

```tsx
{previewImage && (
  <div 
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    onClick={() => setPreviewImage(null)}
  >
    <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
      <img 
        src={previewImage} 
        alt="Preview" 
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={() => setPreviewImage(null)}
        className="absolute top-4 right-4 size-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white flex items-center justify-center transition-all"
      >
        ✕
      </button>
    </div>
  </div>
)}
```

## 支持的图片格式

- PNG
- JPEG/JPG
- GIF
- WebP
- SVG
- 任何浏览器支持的图片格式

## 使用场景

### 1. 数据可视化图表

AI 生成的图表可以点击放大查看细节：

```markdown
这是未来7天的温度趋势图：

![温度趋势](https://example.com/chart.png)
```

### 2. 设备状态截图

查看设备状态的详细截图：

```markdown
当前设备状态如下：

![设备状态](https://example.com/status.png)
```

### 3. 操作指南图片

查看操作步骤的详细图片：

```markdown
请按照以下步骤操作：

![操作步骤](https://example.com/guide.png)
```

## 优势

1. **更好的可读性**: 图表和图片可以放大查看细节
2. **简单直观**: 点击即可预览，无需额外操作
3. **响应式**: 自动适应不同屏幕尺寸
4. **优雅的交互**: 平滑的动画和过渡效果
5. **易于关闭**: 多种关闭方式

## 未来增强

### 1. 图片缩放

```typescript
const [zoom, setZoom] = useState(1)

<img 
  style={{ transform: `scale(${zoom})` }}
  onWheel={(e) => {
    e.preventDefault()
    setZoom(prev => Math.max(0.5, Math.min(3, prev + (e.deltaY > 0 ? -0.1 : 0.1))))
  }}
/>
```

### 2. 图片拖动

```typescript
const [position, setPosition] = useState({ x: 0, y: 0 })

<img 
  draggable
  onDrag={(e) => setPosition({ x: e.clientX, y: e.clientY })}
/>
```

### 3. 图片下载

```tsx
<button onClick={() => {
  const a = document.createElement('a')
  a.href = previewImage
  a.download = 'image.png'
  a.click()
}}>
  下载图片
</button>
```

### 4. 图片旋转

```typescript
const [rotation, setRotation] = useState(0)

<img 
  style={{ transform: `rotate(${rotation}deg)` }}
/>
<button onClick={() => setRotation(prev => prev + 90)}>
  旋转
</button>
```

## 测试场景

### 测试 1: 点击图片
1. AI 回复包含图片
2. 点击图片
3. **预期**: 打开全屏预览 ✓

### 测试 2: 关闭预览
1. 打开图片预览
2. 点击背景或关闭按钮
3. **预期**: 关闭预览 ✓

### 测试 3: 响应式
1. 在不同设备上打开预览
2. **预期**: 图片自动适应屏幕 ✓

## 注意事项

1. **图片加载**: 大图片可能需要时间加载
2. **网络问题**: 图片 URL 失效会显示破损图标
3. **性能**: 超大图片可能影响性能
4. **安全**: 只显示可信来源的图片

## 总结

图片预览功能为 AI 助手提供了更好的视觉体验，用户可以轻松查看图表、截图和其他图片的细节，提升了整体的使用体验。
