# Device Control 页面网格布局更新

## 更新内容

### 1. 使用 React Grid Layout
将设备卡片从固定的 CSS Grid 布局改为可拖拽、可调整大小的 Grid Layout。

### 2. 功能特性

#### 编辑模式
- 点击"编辑布局"按钮进入编辑模式
- 可以拖拽卡片到任意位置
- 可以调整卡片大小
- 点击"保存布局"保存自定义布局

#### 布局持久化
- 布局保存到 localStorage
- 页面刷新后保持自定义布局
- 使用 key: `device-control-layout`

### 3. 默认布局

```javascript
const defaultLayout = [
  { i: "pump", x: 0, y: 0, w: 4, h: 2 },           // 水泵
  { i: "growLight", x: 4, y: 0, w: 4, h: 2 },     // 补光灯
  { i: "whiteLight", x: 8, y: 0, w: 4, h: 2 },    // 白灯
  { i: "fan", x: 0, y: 2, w: 4, h: 2 },           // 风扇
  { i: "rgbControl", x: 4, y: 2, w: 8, h: 2 },    // RGB控制（占2列）
  { i: "tempSensor", x: 0, y: 4, w: 8, h: 2 },    // 温湿度传感器（占2列）
  { i: "co2Sensor", x: 8, y: 4, w: 4, h: 2 },     // CO₂传感器
]
```

### 4. 网格配置

- **列数**: 12列
- **行高**: 80px
- **宽度**: 1200px（自适应容器）
- **间距**: 由 CSS gap 控制

### 5. 设备卡片列表

1. **水泵** (pump)
   - 图标: Droplet
   - 颜色: 蓝色渐变
   - 控制: Toggle 开关

2. **补光灯** (growLight)
   - 图标: Lightbulb
   - 颜色: 黄色渐变
   - 控制: Toggle 开关

3. **白灯** (whiteLight)
   - 图标: Sun
   - 颜色: 紫色渐变
   - 控制: Toggle 开关

4. **风扇** (fan)
   - 图标: Fan
   - 颜色: 蓝色渐变
   - 控制: Toggle 开关

5. **RGB 控制** (rgbControl)
   - 特殊卡片，占用更大空间
   - 包含颜色预览和 RGB 滑块
   - 控制: 3个滑块（R/G/B）

6. **温湿度传感器** (tempSensor)
   - 图标: Thermometer
   - 颜色: 棕色渐变
   - 控制: Toggle 开关

7. **CO₂ 传感器** (co2Sensor)
   - 图标: Wind
   - 颜色: 红棕色渐变
   - 控制: Toggle 开关

## 使用方法

### 编辑布局
1. 点击右上角"编辑布局"按钮
2. 拖拽卡片到想要的位置
3. 拖拽卡片边角调整大小
4. 点击"保存布局"保存更改

### 重置布局
如果需要重置到默认布局：
1. 打开浏览器开发者工具（F12）
2. 在 Console 中输入：
   ```javascript
   localStorage.removeItem('device-control-layout')
   ```
3. 刷新页面

## 技术实现

### 关键代码

```typescript
// 布局状态
const [layout, setLayout] = useState(defaultLayout)
const [isEditMode, setIsEditMode] = useState(false)

// 加载保存的布局
useEffect(() => {
  const savedLayout = localStorage.getItem('device-control-layout')
  if (savedLayout) {
    setLayout(JSON.parse(savedLayout))
  }
}, [])

// 保存布局
const handleSaveLayout = () => {
  localStorage.setItem('device-control-layout', JSON.stringify(layout))
  setIsEditMode(false)
}

// GridLayout 配置
<GridLayout
  layout={layout}
  cols={12}
  rowHeight={80}
  width={1200}
  isDraggable={isEditMode}
  isResizable={isEditMode}
  onLayoutChange={onLayoutChange}
/>
```

## 与 Dashboard 的一致性

Device Control 页面现在与 Dashboard 页面使用相同的布局系统：
- ✅ 相同的 Grid Layout 库
- ✅ 相同的编辑/保存模式
- ✅ 相同的布局持久化机制
- ✅ 一致的用户体验

## 注意事项

1. **响应式设计**: 当前配置针对桌面端优化，移动端可能需要调整
2. **布局验证**: 没有对布局进行验证，用户可能创建重叠的卡片
3. **性能**: 大量卡片时可能影响性能，当前7个卡片表现良好

## 未来改进

1. **布局预设**: 提供多个预设布局供用户选择
2. **导入/导出**: 允许用户导出和导入布局配置
3. **响应式优化**: 针对不同屏幕尺寸优化布局
4. **布局验证**: 防止卡片重叠或超出边界
5. **动画优化**: 添加更流畅的过渡动画

## 相关文件

- `app/device-control/page.tsx` - 主页面文件
- `components/page-navigation.tsx` - 导航组件
- `react-grid-layout` - 网格布局库

## 测试建议

1. 测试拖拽功能是否流畅
2. 测试调整大小是否正常
3. 测试布局保存和加载
4. 测试在不同浏览器中的表现
5. 测试 RGB 控制卡片的交互
