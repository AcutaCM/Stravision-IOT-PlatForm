# Grid Layout 宽度匹配修复

## 问题描述
GridLayout 的网格区域与实际卡片大小不匹配，导致：
- 卡片位置不准确
- 拖拽时跳动
- 网格线与卡片不对齐

## 根本原因
使用固定或估算的宽度值，而不是容器的实际宽度：
```typescript
// ❌ 错误：使用估算值
width={(window.innerWidth - 64) * 0.6}

// ❌ 错误：使用固定值
width={1200}
```

## 解决方案

### 1. 使用 ref 获取容器实际宽度
```typescript
const containerRef = useRef<HTMLDivElement>(null)
const [containerWidth, setContainerWidth] = useState(1000)
```

### 2. 监听容器宽度变化
```typescript
useEffect(() => {
  const updateWidth = () => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth - 48 // 减去 padding
      setContainerWidth(width)
    }
  }

  updateWidth()
  window.addEventListener('resize', updateWidth)
  return () => window.removeEventListener('resize', updateWidth)
}, [])
```

### 3. 将 ref 绑定到容器
```typescript
<div
  ref={containerRef}
  className="relative h-full rounded-3xl bg-gradient-to-br from-[#0f1419] to-[#0a0e14] p-6 ..."
>
```

### 4. 使用实际宽度
```typescript
<GridLayout
  width={containerWidth}  // ✅ 使用实际测量的宽度
  ...
/>
```

## 宽度计算说明

### 为什么减去 48px？
```typescript
const width = containerRef.current.offsetWidth - 48
```

- 容器有 `p-6` (padding: 1.5rem = 24px)
- 左右两边各 24px
- 总共需要减去 48px

### 如果还有间距问题
检查以下因素：
1. **容器 padding**: 确认实际的 padding 值
2. **边框宽度**: 如果有边框，也需要减去
3. **滚动条**: 如果有滚动条，可能需要额外减去宽度

```typescript
// 更精确的计算
const width = containerRef.current.offsetWidth 
  - 48  // padding (24px * 2)
  - 2   // border (1px * 2)
  - 17  // scrollbar (如果有)
```

## 完整实现

```typescript
export default function DeviceControlPage() {
  // State
  const [layout, setLayout] = useState(defaultLayout)
  const [containerWidth, setContainerWidth] = useState(1000)
  const containerRef = useRef<HTMLDivElement>(null)

  // 更新容器宽度
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth - 48
        setContainerWidth(width)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative h-full rounded-3xl bg-gradient-to-br from-[#0f1419] to-[#0a0e14] p-6 overflow-auto border border-white/5 shadow-2xl"
    >
      <GridLayout
        layout={layout}
        cols={12}
        rowHeight={80}
        width={containerWidth}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={onLayoutChange}
        compactType={null}
        preventCollision={true}
      >
        {/* 卡片内容 */}
      </GridLayout>
    </div>
  )
}
```

## 验证方法

### 1. 检查宽度值
在浏览器控制台：
```javascript
// 获取容器元素
const container = document.querySelector('.layout').parentElement
console.log('Container width:', container.offsetWidth)
console.log('GridLayout width:', container.offsetWidth - 48)
```

### 2. 检查网格对齐
- 进入编辑模式
- 观察网格线是否与卡片边缘对齐
- 拖拽卡片，检查是否平滑移动

### 3. 测试响应式
- 调整浏览器窗口大小
- 检查网格是否自动调整
- 确认卡片位置保持正确

## 常见问题

### Q: 为什么初始宽度设为 1000？
```typescript
const [containerWidth, setContainerWidth] = useState(1000)
```
**A**: 这是一个合理的默认值，在容器实际宽度计算完成前使用。可以根据实际情况调整。

### Q: 窗口大小变化时卡片会重新排列吗？
**A**: 不会。只有宽度会更新，布局位置保持不变。如果需要响应式布局，需要额外的逻辑。

### Q: 为什么不直接使用 100%？
**A**: GridLayout 需要具体的像素值来计算网格，不能使用百分比。

### Q: 性能影响如何？
**A**: 
- `resize` 事件监听器有轻微性能影响
- 可以使用防抖（debounce）优化：
```typescript
import { debounce } from 'lodash'

const updateWidth = debounce(() => {
  if (containerRef.current) {
    setContainerWidth(containerRef.current.offsetWidth - 48)
  }
}, 100)
```

## 对比：修复前后

### 修复前
```typescript
// 使用估算值
width={(window.innerWidth - 64) * 0.6}

// 问题：
// ❌ 不准确
// ❌ 不响应容器变化
// ❌ 网格与卡片不对齐
```

### 修复后
```typescript
// 使用实际测量值
width={containerWidth}

// 优点：
// ✅ 精确匹配容器
// ✅ 自动响应变化
// ✅ 网格完美对齐
```

## 其他页面应用

这个方法也可以应用到 dashboard 页面：

```typescript
// dashboard/page.tsx
const containerRef = useRef<HTMLDivElement>(null)
const [containerWidth, setContainerWidth] = useState(1600)

useEffect(() => {
  const updateWidth = () => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth - 64)
    }
  }
  updateWidth()
  window.addEventListener('resize', updateWidth)
  return () => window.removeEventListener('resize', updateWidth)
}, [])
```

## 总结

通过使用 ref 获取容器的实际宽度，而不是估算或使用固定值，可以确保：
- ✅ 网格区域与卡片完美对齐
- ✅ 拖拽流畅无跳动
- ✅ 自动适应容器大小变化
- ✅ 更好的用户体验

这是处理 GridLayout 宽度问题的最佳实践！
