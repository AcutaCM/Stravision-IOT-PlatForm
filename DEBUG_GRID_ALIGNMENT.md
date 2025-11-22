# Grid Layout 对齐调试指南

## 快速检查步骤

### 1. 打开浏览器开发者工具
按 F12 或右键 -> 检查

### 2. 在 Console 中运行以下命令

```javascript
// 检查容器宽度
const container = document.querySelector('[class*="rounded-3xl"][class*="p-6"]')
console.log('Container offsetWidth:', container.offsetWidth)
console.log('Container clientWidth:', container.clientWidth)
console.log('Container computed width:', getComputedStyle(container).width)

// 检查 GridLayout 宽度
const gridLayout = document.querySelector('.react-grid-layout')
console.log('GridLayout width:', gridLayout.style.width)

// 检查单个网格项
const gridItem = document.querySelector('.react-grid-item')
console.log('Grid item width:', gridItem.offsetWidth)
console.log('Grid item transform:', gridItem.style.transform)
```

### 3. 检查计算结果

应该看到类似这样的输出：
```
Container width updated: 950
Container offsetWidth: 998
Container clientWidth: 998
GridLayout width: 950px
```

## 常见问题诊断

### 问题 1: 宽度为 0 或 undefined
**症状**: Console 显示 `Container width updated: 0`

**原因**: 容器还没有渲染完成

**解决方案**: 已添加 `setTimeout` 延迟执行
```typescript
setTimeout(updateWidth, 100)
```

### 问题 2: 网格项太小或太大
**症状**: 卡片大小与网格不匹配

**检查**:
```javascript
// 计算单个网格单元的宽度
const containerWidth = 950  // 从 console 获取
const cols = 12
const margin = 20
const cellWidth = (containerWidth - (cols - 1) * margin) / cols
console.log('Cell width:', cellWidth)  // 应该约为 60-80px
```

**调整**: 修改 `margin` 或 `rowHeight`
```typescript
<GridLayout
  margin={[20, 20]}  // [x, y] 间距
  rowHeight={80}     // 行高
/>
```

### 问题 3: 卡片位置偏移
**症状**: 卡片不在网格线上

**检查 padding**:
```javascript
const container = document.querySelector('[class*="p-6"]')
const styles = getComputedStyle(container)
console.log('Padding:', styles.padding)
```

**调整计算**:
```typescript
// 如果 padding 是 24px
const width = containerRef.current.clientWidth - 48

// 如果 padding 不同，相应调整
const width = containerRef.current.clientWidth - (paddingLeft + paddingRight)
```

### 问题 4: 响应式不工作
**症状**: 调整窗口大小后网格不更新

**检查事件监听器**:
```javascript
// 在 Console 中手动触发
window.dispatchEvent(new Event('resize'))
```

**验证 state 更新**:
在组件中添加：
```typescript
useEffect(() => {
  console.log('Container width changed:', containerWidth)
}, [containerWidth])
```

## 推荐配置

### 对于 device-control 页面

```typescript
// 容器配置
<div
  ref={containerRef}
  className="relative h-full rounded-3xl bg-gradient-to-br from-[#0f1419] to-[#0a0e14] p-6 overflow-auto border border-white/5 shadow-2xl"
>

// GridLayout 配置
<GridLayout
  layout={layout}
  cols={12}
  rowHeight={80}
  width={containerWidth}
  margin={[20, 20]}           // 卡片间距
  containerPadding={[0, 0]}   // 容器内边距（已在外层处理）
  isDraggable={isEditMode}
  isResizable={isEditMode}
  compactType={null}
  preventCollision={true}
/>

// 宽度计算
const width = containerRef.current.clientWidth - 48  // p-6 = 24px * 2
```

### 对于 dashboard 页面

```typescript
// 容器配置
<div className="w-full">

// GridLayout 配置
<GridLayout
  layout={layout}
  cols={12}
  rowHeight={80}
  width={window.innerWidth - 64}  // 全屏宽度减去左右 padding
  isDraggable={isEditMode}
  isResizable={isEditMode}
  compactType={null}
  preventCollision={true}
/>
```

## 视觉调试

### 1. 显示网格线
在浏览器 Console 中运行：
```javascript
// 添加网格线样式
const style = document.createElement('style')
style.textContent = `
  .react-grid-layout {
    background-image: 
      repeating-linear-gradient(0deg, transparent, transparent 79px, rgba(255,255,255,0.1) 79px, rgba(255,255,255,0.1) 80px),
      repeating-linear-gradient(90deg, transparent, transparent calc((100% - 11 * 20px) / 12 - 1px), rgba(255,255,255,0.1) calc((100% - 11 * 20px) / 12 - 1px), rgba(255,255,255,0.1) calc((100% - 11 * 20px) / 12));
  }
`
document.head.appendChild(style)
```

### 2. 高亮网格项
```javascript
document.querySelectorAll('.react-grid-item').forEach((item, i) => {
  item.style.outline = '2px solid red'
  item.style.outlineOffset = '-2px'
})
```

### 3. 显示尺寸信息
```javascript
document.querySelectorAll('.react-grid-item').forEach((item, i) => {
  const info = document.createElement('div')
  info.style.cssText = 'position:absolute;top:0;left:0;background:rgba(0,0,0,0.8);color:white;padding:4px;font-size:10px;z-index:9999'
  info.textContent = `${item.offsetWidth}x${item.offsetHeight}`
  item.appendChild(info)
})
```

## 最终验证清单

- [ ] 容器宽度正确计算（检查 console 输出）
- [ ] GridLayout width 与容器匹配
- [ ] 卡片可以拖拽（编辑模式下）
- [ ] 卡片对齐网格线
- [ ] 调整窗口大小时自动更新
- [ ] 保存布局后刷新页面仍然正确

## 如果还是不对齐

### 尝试简化配置
```typescript
<GridLayout
  layout={layout}
  cols={12}
  rowHeight={80}
  width={containerWidth}
  // 移除所有可选配置，只保留必需的
  isDraggable={isEditMode}
  isResizable={isEditMode}
/>
```

### 检查 CSS 冲突
```javascript
// 检查是否有 CSS 影响布局
const gridLayout = document.querySelector('.react-grid-layout')
console.log('Position:', getComputedStyle(gridLayout).position)  // 应该是 relative
console.log('Display:', getComputedStyle(gridLayout).display)    // 应该是 block
```

### 对比 dashboard 页面
1. 打开 dashboard 页面
2. 运行相同的调试命令
3. 对比两个页面的输出
4. 找出差异

## 联系支持

如果以上方法都不能解决问题，请提供：
1. Console 中的宽度输出
2. 浏览器和版本
3. 屏幕截图
4. 网络面板中的错误信息
