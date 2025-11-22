# Grid Layout 拖拽问题故障排查

## 问题：无法拖拽卡片

### 已修复的问题

#### 1. **动态宽度计算**
**问题**：固定宽度 `width={1200}` 导致布局不匹配实际容器
**解决方案**：
```typescript
width={typeof window !== "undefined" ? (window.innerWidth - 64) * 0.6 : 1000}
```

#### 2. **移除 draggableHandle 限制**
**问题**：设置了 `draggableHandle=".drag-handle"` 但卡片上没有这个类
**解决方案**：移除 draggableHandle 属性，允许整个卡片可拖拽

#### 3. **添加视觉反馈**
**问题**：用户不知道卡片可以拖拽
**解决方案**：
```typescript
// 在编辑模式下添加 cursor-move
<Card className={cn(
  "...",
  isDraggable && "cursor-move"
)} />
```

#### 4. **正确的 GridLayout 配置**
```typescript
<GridLayout
  layout={layout}
  cols={12}
  rowHeight={80}
  width={动态计算}
  isDraggable={isEditMode}
  isResizable={isEditMode}
  onLayoutChange={onLayoutChange}
  compactType={null}          // 不自动压缩
  preventCollision={true}      // 防止重叠
/>
```

## 使用步骤

### 1. 进入编辑模式
- 点击右上角"编辑布局"按钮
- 按钮变为绿色"保存布局"
- 卡片显示 `cursor-move` 光标

### 2. 拖拽卡片
- 鼠标悬停在卡片上
- 按住鼠标左键
- 拖动到目标位置
- 释放鼠标

### 3. 调整大小
- 鼠标移到卡片右下角
- 出现调整大小的手柄
- 拖动调整大小

### 4. 保存布局
- 点击"保存布局"按钮
- 布局保存到 localStorage
- 退出编辑模式

## 常见问题

### Q: 点击"编辑布局"后仍然无法拖拽
**A**: 检查以下几点：
1. 确认 `isEditMode` 状态已更新
2. 检查浏览器控制台是否有错误
3. 确认 GridLayout 的 `isDraggable` 属性绑定正确
4. 刷新页面重试

### Q: 拖拽时卡片跳动或位置不准确
**A**: 这通常是宽度计算问题：
1. 检查容器的实际宽度
2. 调整 width 计算公式
3. 确保没有 CSS 冲突

### Q: 保存后刷新页面布局丢失
**A**: 检查 localStorage：
```javascript
// 在浏览器控制台查看
localStorage.getItem('device-control-layout')

// 如果为 null，说明没有保存成功
// 检查 handleSaveLayout 函数
```

### Q: 卡片重叠
**A**: 
```typescript
// 确保设置了 preventCollision
preventCollision={true}

// 或者手动调整布局避免重叠
```

### Q: 调整大小时卡片内容变形
**A**: 
- 检查卡片内容的 CSS
- 使用 `min-h-[200px]` 设置最小高度
- 确保内容使用 flexbox 布局

## 调试技巧

### 1. 检查状态
```typescript
// 在组件中添加调试输出
console.log('isEditMode:', isEditMode)
console.log('layout:', layout)
```

### 2. 检查 GridLayout 属性
```typescript
// 确认所有必需属性都已设置
<GridLayout
  layout={layout}              // ✓ 必需
  cols={12}                    // ✓ 必需
  rowHeight={80}               // ✓ 必需
  width={计算值}               // ✓ 必需
  isDraggable={isEditMode}     // ✓ 必需
  isResizable={isEditMode}     // ✓ 必需
  onLayoutChange={handler}     // ✓ 必需
/>
```

### 3. 检查 CSS
```css
/* 确保没有 CSS 阻止拖拽 */
.layout {
  /* 不要设置 pointer-events: none */
}

.react-grid-item {
  /* GridLayout 会自动添加这个类 */
  /* 不要覆盖它的样式 */
}
```

### 4. 浏览器开发者工具
- 打开 Elements 面板
- 检查 `.react-grid-item` 元素
- 查看是否有 `transform` 样式
- 检查是否有 `draggable` 属性

## 性能优化

### 1. 避免频繁重渲染
```typescript
// 使用 useCallback 包装处理函数
const onLayoutChange = useCallback((newLayout) => {
  if (isEditMode) {
    setLayout(newLayout)
  }
}, [isEditMode])
```

### 2. 限制卡片数量
- 当前 7 个卡片性能良好
- 超过 20 个可能需要虚拟化

### 3. 优化动画
```css
/* 使用 CSS transform 而不是 position */
.react-grid-item {
  transition: transform 0.2s ease;
}
```

## 与 Dashboard 的对比

| 特性 | Dashboard | Device Control |
|------|-----------|----------------|
| 列数 | 12 | 12 |
| 行高 | 80px | 80px |
| 宽度计算 | `window.innerWidth - 64` | `(window.innerWidth - 64) * 0.6` |
| 防止重叠 | true | true |
| 自动压缩 | null | null |
| 卡片数量 | 12+ | 7 |

## 相关资源

- [react-grid-layout 文档](https://github.com/react-grid-layout/react-grid-layout)
- [示例代码](https://react-grid-layout.github.io/react-grid-layout/examples/0-showcase.html)
- [API 参考](https://github.com/react-grid-layout/react-grid-layout#grid-layout-props)

## 更新日志

- **2024-11-21**: 修复拖拽问题
  - 移除 draggableHandle 限制
  - 添加动态宽度计算
  - 添加 cursor-move 视觉反馈
  - 更新 DeviceCard 组件支持 isDraggable 属性
