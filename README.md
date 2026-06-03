# AI 图片工具箱

一个纯前端的浏览器图片处理工具集。项目不使用框架、不需要构建步骤，主要图片处理都在浏览器本地通过 Canvas API 完成；AI 去背景和 AI 增强需要用户自行提供第三方 API Key。

## 功能

- 图片压缩：支持单张和批量压缩，质量可调，支持前后对比和下载。
- 格式转换：支持 JPG、PNG、WebP 互转，支持批量 ZIP 下载。
- 批量水印：支持文字水印、Logo 水印、位置、透明度和大小调整。
- AI 去背景：调用 remove.bg API，输出透明 PNG。
- 图片裁剪：拖拽选择区域后裁剪并下载。
- AI 图片增强：调用 DeepAI 超分辨率 API。
- 主题切换：支持亮色和暗色模式。

## 技术栈

- HTML / CSS / JavaScript
- Canvas API
- JSZip CDN
- remove.bg API
- DeepAI API

没有打包器、没有构建流程、没有后端服务。

## 本地运行

直接用静态服务器启动项目根目录即可：

```bash
python -m http.server 8080
```

然后打开：

```text
http://127.0.0.1:8080/
```

也可以用任意静态服务器，例如：

```bash
npx serve .
```

## API Key

AI 功能需要用户在页面里输入自己的 API Key：

- AI 去背景：remove.bg API Key
- AI 图片增强：DeepAI API Key

API Key 不写入代码仓库。remove.bg 页面当前会把 key 存到浏览器 `localStorage`，方便同一浏览器下重复使用。

## 项目结构

```text
index.html
css/
  variables.css
  base.css
  navbar.css
  home.css
  upload.css
  compare.css
  controls.css
  results.css
  responsive.css
js/
  main.js
  router.js
  theme.js
  upload.js
  image-pipeline.js
  batch-processor.js
  tool-shell.js
  compare.js
  download.js
  history.js
  drag-sort.js
  compress.js
  convert.js
  watermark.js
  remove-bg.js
  crop.js
  enhance.js
  utils.js
tests/
  html-smoke.js
  runtime-smoke.js
```

## 测试

当前有两个轻量 smoke test：

```bash
node tests/html-smoke.js
node tests/runtime-smoke.js
```

`html-smoke.js` 会检查外部脚本 SRI 和 favicon 配置。  
`runtime-smoke.js` 会检查核心图片处理 helper 和批处理 helper 的基础行为。

## 使用说明

1. 打开首页。
2. 选择图片压缩、格式转换、水印、去背景、裁剪或增强工具。
3. 上传 JPG、PNG 或 WebP 图片。
4. 调整参数。
5. 下载处理结果。

批量模式最多支持 10 张图片，单张最大 10MB。

## 注意事项

- JPG 不支持透明通道，导出 JPG 时透明区域会用白色背景填充。
- WebP 输出依赖浏览器支持，页面会根据 `canvas.toDataURL` 能力检测。
- 批量 ZIP 下载依赖 JSZip CDN，离线环境下不可用。
- AI 功能依赖第三方服务可用性、网络环境和 API Key 配额。
