# 项目 4 技术栈与学习路线：AI 图片工具箱

## 技术栈总览

| 技术 | 用途 | 优先级 |
|------|------|--------|
| HTML/CSS/JS | 页面结构和交互 | 必学 |
| Canvas API | 图片处理核心（压缩/转换/水印） | 必学 |
| File API + Drag & Drop | 文件上传和拖拽 | 必学 |
| Blob API + URL.createObjectURL | 文件下载 | 必学 |
| JSZip (CDN) | 批量打包下载 | 建议学 |
| AI API (GLM/remove.bg) | AI 去背景 | 必学 |

## 前置知识

- HTML/CSS/JS 基础（项目 1-3 的水平）
- Canvas API 基本概念（知道 canvas 元素是什么）
- 了解 Blob/File 概念（浏览器文件处理）

## 学习路线

> 预计学习 + 实操每天 3-4 小时，共约 20 小时

### 第 1 天：File API + 拖拽上传（约 3 小时）

**目标：** 实现图片的拖拽和选择上传

**学习内容：**
- `<input type="file">` 和 accept 属性限制文件类型
- File API：File 对象、FileReader
- Drag and Drop API：dragover、drop 事件
- URL.createObjectURL 预览图片
- 多文件上传（multiple 属性）
- 文件大小验证（10MB 限制）

**推荐资源：**
- MDN File API: https://developer.mozilla.org/zh-CN/docs/Web/API/File
- MDN Drag & Drop: https://developer.mozilla.org/zh-CN/docs/Web/API/HTML_Drag_and_Drop_API
- YouTube: **Web Dev Simplified** — "Drag And Drop File Upload JavaScript"
- B站搜索「JavaScript 拖拽上传文件」
- YouTube: **Traversy Media** — "File Upload With JavaScript"

### 第 2 天：Canvas API — 图片压缩与格式转换（约 4 小时）

**目标：** 用 Canvas 实现核心的图片处理功能

**学习内容：**
- Canvas 基础：getContext('2d')、drawImage
- canvas.toBlob(callback, type, quality) — 压缩关键方法
- canvas.toDataURL() — 格式转换
- 图片格式 MIME 类型：image/jpeg, image/png, image/webp
- 保持宽高比缩放（计算目标尺寸）
- 图片 EXIF 方向处理（避免旋转问题）

**推荐资源：**
- MDN Canvas Tutorial: https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API/Tutorial
- YouTube: **Traversy Media** — "Canvas Crash Course"
- YouTube: **Build a Image Compressor Web App Using Canvas API**: https://www.youtube.com/watch?v=QcUwVBACvCs
- **imagekit.io 博客**: "Image compression techniques in JavaScript (Updated 2025)"
- **dev.to**: "Building a Client-Side Image Compressor with Canvas API"

### 第 3 天：Canvas 水印 + 批量处理（约 4 小时）

**目标：** 实现批量添加文字水印

**学习内容：**
- Canvas fillText / strokeText — 文字绘制
- Canvas 字体设置（font, textAlign, textBaseline）
- globalAlpha — 透明度控制
- 批量处理模式（for...of + async/await）
- 进度条 UI（处理进度百分比）
- Promise 封装 Canvas 操作

**推荐资源：**
- MDN Canvas 文字绘制: https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API/Tutorial/Drawing_text
- **theproductguy.in**: "Image Watermark Tool: Add Text or Logo"（完整教程）
- YouTube: **Florin Pop** — "Canvas Text Effects"
- B站搜索「Canvas 文字水印 JavaScript」

### 第 4 天：JSZip 批量打包 + 对比滑块（约 3 小时）

**目标：** 批量下载 ZIP 和图片前后对比组件

**学习内容：**
- JSZip CDN 引入和基本用法
- zip.file(name, blob) 添加文件
- zip.generateAsync({type:'blob'}) 生成 ZIP
- 前后对比滑块（CSS clip-path + 拖拽事件）
- 棋盘格透明背景（CSS background-image）

**推荐资源：**
- JSZip 官方文档: https://stuk.github.io/jszip/
- YouTube: **Web Dev Simplified** — "Image Comparison Slider"
- B站搜索「JSZip 批量下载」
- B站搜索「图片对比滑块 CSS JavaScript」

### 第 5 天：AI 去背景 API 集成（约 3 小时）

**目标：** 调用 AI API 实现去背景功能

**学习内容：**
- remove.bg API 调用（或 GLM 视觉模型）
- FormData 上传文件到 API
- 返回的 PNG 透明图片处理
- API Key 管理（用户设置页）
- 加载状态和错误处理

**推荐资源：**
- remove.bg API 文档: https://www.remove.bg/api
- YouTube: **Traversy Media** — "Fetch API"
- MDN FormData: https://developer.mozilla.org/zh-CN/docs/Web/API/FormData

## 关键 API 速查

```javascript
// 图片压缩（核心）
function compressImage(file, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        resolve(blob); // 压缩后的 Blob
      }, 'image/jpeg', quality); // quality: 0.1 ~ 1.0
    };
    img.src = URL.createObjectURL(file);
  });
}

// 格式转换
function convertFormat(file, format) {
  const mimeType = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  // 同压缩逻辑，改变 toBlob 的 MIME type
}

// 添加水印
function addWatermark(img, text, options) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  ctx.globalAlpha = options.opacity;     // 透明度
  ctx.font = `${options.fontSize}px sans-serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.fillText(text, options.x, options.y);
  return canvas.toDataURL('image/png');
}

// JSZip 批量打包
const zip = new JSZip();
images.forEach((blob, i) => zip.file(`image_${i}.jpg`, blob));
const zipBlob = await zip.generateAsync({ type: 'blob' });

// 拖拽上传
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
  handleFiles(files);
});
```

## 快速上手提示（Vibe Coding 加速法）

1. **拖拽上传组件通用** — 第 1 天做好后，所有 4 个工具都复用同一个上传组件
2. **Canvas 核心 3 行代码** — `new Image()` → `ctx.drawImage()` → `canvas.toBlob()`，别想复杂了
3. **压缩工具是核心** — 先把压缩做好，格式转换只是换 MIME type，水印只是加 fillText
4. **对比滑块很加分** — 一个 div + CSS clip-path + 拖拽事件，视觉效果非常好
5. **AI 去背景可以最后做** — 这个依赖外部 API，前面 3 个工具都是纯浏览器本地处理
