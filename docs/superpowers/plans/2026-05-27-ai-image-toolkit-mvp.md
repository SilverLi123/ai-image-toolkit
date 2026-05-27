# AI Image Toolkit MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP of AI Image Toolkit — home page with tool cards, image compression tool with comparison slider, and base architecture (hash router, shared upload, dark/light theme).

**Architecture:** Single-page app with hash routing. Each page is a JS module exporting `render(container)` and `destroy()`. All image processing uses browser Canvas API. No frameworks, no build tools — ES modules loaded natively.

**Tech Stack:** HTML, CSS (custom properties for theming), vanilla JS (ES modules), Canvas API, JSZip (CDN for batch download).

**Testing:** This project has no automated test framework by design (no build tools). Each task includes manual browser verification steps. Serve with `npx serve .` or `python -m http.server 8080` — ES modules require a server, `file://` won't work.

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Shell: navbar + `#app` container, all CSS `<link>` tags, JSZip CDN, `<script type="module">` entry |
| `css/variables.css` | CSS custom properties for light + dark themes |
| `css/base.css` | Reset, body, `#app` layout, utility classes (`.hidden`) |
| `css/navbar.css` | Top navigation bar |
| `css/home.css` | Tool card grid with gradient backgrounds |
| `css/upload.css` | Dashed-border drag zone, hover/dragover states |
| `css/compare.css` | Comparison slider, checkerboard transparent background |
| `css/controls.css` | Range sliders, buttons, settings sidebar |
| `css/results.css` | Batch result thumbnail list |
| `css/responsive.css` | 768px breakpoint: side-by-side → stacked |
| `js/main.js` | Entry: import modules, register routes, init theme + router |
| `js/router.js` | Hash router: path → page module map, render/destroy lifecycle |
| `js/theme.js` | Dark/light toggle, `localStorage` persistence |
| `js/home.js` | Home page: tool card grid |
| `js/upload.js` | Shared upload component: drag-drop + click, validation |
| `js/compress.js` | Compression tool: single image + batch mode |
| `js/compare.js` | Comparison slider component with mouse + touch support |
| `js/download.js` | Single file download + JSZip batch packaging |
| `js/utils.js` | `loadImage()`, `canvasToBlob()`, `formatFileSize()` |
| `.gitignore` | Ignore `.superpowers/` |

---

### Task 1: Scaffold + CSS Foundation

**Files:**
- Create: `css/variables.css`
- Create: `css/base.css`
- Create: `css/navbar.css`
- Create: `index.html`
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```gitignore
.superpowers/
```

- [ ] **Step 2: Create `css/variables.css`**

```css
:root {
  --brand-start: #667eea;
  --brand-end: #764ba2;
  --brand-gradient: linear-gradient(135deg, var(--brand-start), var(--brand-end));

  --bg-primary: #ffffff;
  --bg-card: #f5f5f7;
  --bg-upload: #fafafa;
  --bg-input: #f3f4f6;

  --text-primary: #1a1a1a;
  --text-secondary: #6b7280;
  --text-inverse: #ffffff;

  --border-color: #e5e7eb;
  --border-active: var(--brand-start);

  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

  --checkerboard: repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%) 0 0 / 16px 16px;

  --transition: 0.3s ease;
}

[data-theme="dark"] {
  --bg-primary: #0f0f1a;
  --bg-card: #1a1a2e;
  --bg-upload: #16162a;
  --bg-input: #1e1e3a;

  --text-primary: #f0f0f0;
  --text-secondary: #9ca3af;

  --border-color: #2d2d4a;
  --border-active: var(--brand-start);

  --shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.4);

  --checkerboard: repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 0 0 / 16px 16px;
}
```

- [ ] **Step 3: Create `css/base.css`**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: background var(--transition), color var(--transition);
  line-height: 1.6;
}

#app {
  min-height: calc(100vh - 60px);
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.hidden {
  display: none !important;
}
```

- [ ] **Step 4: Create `css/navbar.css`**

```css
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
  transition: background var(--transition), border-color var(--transition);
}

.navbar-brand {
  font-size: 20px;
  font-weight: 700;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  cursor: pointer;
  text-decoration: none;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: background var(--transition), border-color var(--transition);
}
```

- [ ] **Step 5: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI 图片工具箱</title>
    <link rel="stylesheet" href="css/variables.css" />
    <link rel="stylesheet" href="css/base.css" />
    <link rel="stylesheet" href="css/navbar.css" />
    <link rel="stylesheet" href="css/home.css" />
    <link rel="stylesheet" href="css/upload.css" />
    <link rel="stylesheet" href="css/compare.css" />
    <link rel="stylesheet" href="css/controls.css" />
    <link rel="stylesheet" href="css/results.css" />
    <link rel="stylesheet" href="css/responsive.css" />
  </head>
  <body>
    <nav class="navbar">
      <a class="navbar-brand" href="#/">AI 图片工具箱</a>
      <div class="navbar-actions">
        <button class="theme-toggle" id="theme-toggle">🌙</button>
      </div>
    </nav>
    <div id="app"></div>
    <script
      src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
      integrity="sha512-XMVd28F1oH/Ol4v1iFgf3+s6n0J/IBi6Efj+0ZTRMiueE0dI1YJ7IcuJFh7GII2q8m0LHJQ9UPYP8bODVfAew=="
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
    ></script>
    <script type="module" src="js/main.js"></script>
  </body>
</html>
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore index.html css/
git commit -m "feat: project scaffold with CSS foundation and theme variables"
```

---

### Task 2: Theme Toggle

**Files:**
- Create: `js/theme.js`

- [ ] **Step 1: Create `js/theme.js`**

```js
export function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  updateIcon(saved);

  const toggle = document.getElementById("theme-toggle");
  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    updateIcon(next);
  });
}

function updateIcon(theme) {
  document.getElementById("theme-toggle").textContent =
    theme === "dark" ? "☀️" : "🌙";
}
```

- [ ] **Step 2: Verify**

Start server: `npx serve .` or `python -m http.server 8080`. Open in browser. Page should show empty shell with navbar and theme toggle button. Clicking 🌙 should switch to dark mode, clicking ☀️ switches back. Refresh should persist the theme.

- [ ] **Step 3: Commit**

```bash
git add js/theme.js
git commit -m "feat: dark/light theme toggle with localStorage persistence"
```

---

### Task 3: Hash Router + Main Entry

**Files:**
- Create: `js/router.js`
- Create: `js/main.js`

- [ ] **Step 1: Create `js/router.js`**

```js
const routes = {};
let currentPage = null;

export function registerRoute(path, pageModule) {
  routes[path] = pageModule;
}

export function navigate(path) {
  window.location.hash = "#/" + path;
}

function handleRoute() {
  const hash = window.location.hash.slice(2) || "";

  if (currentPage && currentPage.destroy) {
    currentPage.destroy();
  }

  const app = document.getElementById("app");
  app.innerHTML = "";

  const page = routes[hash] || routes[""];
  currentPage = page;
  if (page && page.render) {
    page.render(app);
  }
}

export function initRouter() {
  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}
```

- [ ] **Step 2: Create `js/main.js`**

```js
import { initRouter, registerRoute } from "./router.js";
import { initTheme } from "./theme.js";
import * as home from "./home.js";
import * as compress from "./compress.js";

registerRoute("", home);
registerRoute("compress", compress);

initTheme();
initRouter();
```

- [ ] **Step 3: Verify**

Open browser. Console may show 404 for `home.js` and `compress.js` (they don't exist yet). That's expected — router is wired but pages aren't created. No JS errors besides the missing modules.

- [ ] **Step 4: Commit**

```bash
git add js/router.js js/main.js
git commit -m "feat: hash router with page lifecycle (render/destroy)"
```

---

### Task 4: Home Page

**Files:**
- Create: `css/home.css`
- Create: `js/home.js`

- [ ] **Step 1: Create `css/home.css`**

```css
.home {
  text-align: center;
  padding-top: 32px;
}

.home-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.home-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 40px;
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.tool-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  border-radius: var(--radius);
  color: var(--text-inverse);
  text-decoration: none;
  box-shadow: var(--shadow);
  transition: transform var(--transition), box-shadow var(--transition);
  cursor: pointer;
  min-height: 180px;
}

.tool-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.tool-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.tool-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
}

.tool-desc {
  font-size: 13px;
  opacity: 0.9;
}
```

- [ ] **Step 2: Create `js/home.js`**

```js
const tools = [
  {
    id: "compress",
    icon: "🖼️",
    name: "图片压缩",
    desc: "压缩图片大小，保持画质",
    gradient: "linear-gradient(135deg, #667eea, #764ba2)",
  },
];

export function render(container) {
  container.innerHTML = `
    <div class="home">
      <h1 class="home-title">AI 图片工具箱</h1>
      <p class="home-subtitle">选择一个工具开始处理你的图片</p>
      <div class="home-grid">
        ${tools
          .map(
            (tool) => `
          <a href="#/${tool.id}" class="tool-card" style="background: ${tool.gradient}">
            <div class="tool-icon">${tool.icon}</div>
            <div class="tool-name">${tool.name}</div>
            <div class="tool-desc">${tool.desc}</div>
          </a>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

export function destroy() {}
```

- [ ] **Step 3: Verify**

Open browser. Home page should show "AI 图片工具箱" heading and one gradient purple card for "图片压缩". Card should have hover lift effect. Clicking the card should change URL to `/#/compress` (compress.js doesn't exist yet, so page will be blank — that's fine). Clicking "AI 图片工具箱" in navbar returns to home.

- [ ] **Step 4: Commit**

```bash
git add css/home.css js/home.js
git commit -m "feat: home page with gradient tool cards"
```

---

### Task 5: Upload Component

**Files:**
- Create: `css/upload.css`
- Create: `js/upload.js`

- [ ] **Step 1: Create `css/upload.css`**

```css
.upload-zone {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius);
  padding: 60px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color var(--transition), background var(--transition);
  max-width: 600px;
  margin: 60px auto;
}

.upload-zone:hover,
.upload-zone.dragover {
  border-color: var(--brand-start);
  background: var(--bg-upload);
}

.upload-zone.dragover {
  border-style: solid;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 16px;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.upload-link {
  color: var(--brand-start);
  font-weight: 600;
  text-decoration: underline;
}

.upload-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

.upload-error {
  display: none;
  margin-top: 12px;
  padding: 8px 12px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: var(--radius-sm);
  font-size: 14px;
}

[data-theme="dark"] .upload-error {
  background: #3b1111;
  color: #f87171;
}
```

- [ ] **Step 2: Create `js/upload.js`**

```js
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

export function createUpload(container, options = {}) {
  const { onFiles, maxFiles = MAX_FILES } = options;

  container.innerHTML = `
    <div class="upload-zone">
      <div class="upload-icon">📁</div>
      <p class="upload-text">拖拽图片到这里，或 <span class="upload-link">点击上传</span></p>
      <p class="upload-hint">支持 JPG / PNG / WebP，单张最大 10MB，最多 ${maxFiles} 张</p>
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>
      <div class="upload-error"></div>
    </div>
  `;

  const zone = container.querySelector(".upload-zone");
  const input = container.querySelector("input");
  const errorEl = container.querySelector(".upload-error");

  zone.addEventListener("click", () => input.click());

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    handleFiles([...e.dataTransfer.files]);
  });

  input.addEventListener("change", () => {
    handleFiles([...input.files]);
    input.value = "";
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = "block";
    setTimeout(() => {
      errorEl.style.display = "none";
    }, 3000);
  }

  function handleFiles(files) {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      showError("请上传图片文件（JPG / PNG / WebP）");
      return;
    }

    const valid = [];
    for (const f of imageFiles) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        showError(`${f.name} 格式不支持`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        showError(`${f.name} 超过 10MB 限制`);
        continue;
      }
      valid.push(f);
    }

    if (valid.length > maxFiles) {
      showError(`最多上传 ${maxFiles} 张图片，已取前 ${maxFiles} 张`);
      valid.length = maxFiles;
    }

    if (valid.length > 0 && onFiles) {
      onFiles(valid);
    }
  }
}
```

- [ ] **Step 3: Verify**

Home page still works. Upload component isn't wired to any page yet, so no visual change. Verify no console errors.

- [ ] **Step 4: Commit**

```bash
git add css/upload.css js/upload.js
git commit -m "feat: shared upload component with drag-drop and validation"
```

---

### Task 6: Canvas Utilities

**Files:**
- Create: `js/utils.js`

- [ ] **Step 1: Create `js/utils.js`**

```js
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image: " + file.name));
    };
    img.src = url;
  });
}

export function canvasToBlob(img, quality, type = "image/jpeg") {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");

    if (type === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
```

- [ ] **Step 2: Commit**

```bash
git add js/utils.js
git commit -m "feat: canvas utility functions (loadImage, canvasToBlob, formatFileSize)"
```

---

### Task 7: Comparison Slider

**Files:**
- Create: `css/compare.css`
- Create: `js/compare.js`

- [ ] **Step 1: Create `css/compare.css`**

```css
.compare {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.compare-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.compare-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--checkerboard);
  cursor: ew-resize;
  user-select: none;
}

.compare-img {
  display: block;
  width: 100%;
  height: auto;
}

.compare-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  clip-path: inset(0 0 0 50%);
}

.compare-overlay .compare-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.compare-slider {
  position: absolute;
  top: 0;
  left: 50%;
  width: 4px;
  height: 100%;
  background: white;
  transform: translateX(-50%);
  pointer-events: none;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
}

.compare-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  cursor: ew-resize;
}
```

- [ ] **Step 2: Create `js/compare.js`**

```js
export function createCompare(container, originalSrc) {
  container.innerHTML = `
    <div class="compare">
      <div class="compare-labels">
        <span>原图</span>
        <span>压缩后</span>
      </div>
      <div class="compare-wrapper">
        <img class="compare-img" src="${originalSrc}" alt="原图">
        <div class="compare-overlay">
          <img class="compare-img" src="${originalSrc}" alt="压缩后">
        </div>
        <div class="compare-slider">
          <div class="compare-handle">⟺</div>
        </div>
      </div>
    </div>
  `;

  const wrapper = container.querySelector(".compare-wrapper");
  const overlay = container.querySelector(".compare-overlay");
  const slider = container.querySelector(".compare-slider");
  let isDragging = false;

  function updatePosition(clientX) {
    const rect = wrapper.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    const percent = (x / rect.width) * 100;
    overlay.style.clipPath = `inset(0 0 0 ${percent}%)`;
    slider.style.left = `${percent}%`;
  }

  wrapper.addEventListener("mousedown", (e) => {
    isDragging = true;
    updatePosition(e.clientX);
  });

  wrapper.addEventListener("touchstart", (e) => {
    isDragging = true;
    updatePosition(e.touches[0].clientX);
  });

  const onMouseMove = (e) => {
    if (isDragging) updatePosition(e.clientX);
  };
  const onTouchMove = (e) => {
    if (isDragging) updatePosition(e.touches[0].clientX);
  };
  const onStop = () => {
    isDragging = false;
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("touchmove", onTouchMove);
  document.addEventListener("mouseup", onStop);
  document.addEventListener("touchend", onStop);

  return {
    updateCompressed(src) {
      overlay.querySelector("img").src = src;
    },
    destroy() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("mouseup", onStop);
      document.removeEventListener("touchend", onStop);
    },
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add css/compare.css js/compare.js
git commit -m "feat: comparison slider with mouse and touch support"
```

---

### Task 8: Compress Tool — Single Image Mode

**Files:**
- Create: `css/controls.css`
- Create: `js/compress.js`
- Create: `js/download.js`

- [ ] **Step 1: Create `css/controls.css`**

```css
.compress-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.compress-sidebar {
  width: 280px;
  flex-shrink: 0;
  position: sticky;
  top: 84px;
}

.compress-sidebar h2 {
  font-size: 20px;
  margin-bottom: 20px;
}

.compress-main {
  flex: 1;
  min-width: 0;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.quality-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quality-row input[type="range"] {
  flex: 1;
}

.quality-value {
  font-size: 16px;
  font-weight: 700;
  min-width: 48px;
  text-align: right;
  color: var(--brand-start);
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: var(--bg-input);
  border-radius: 3px;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--brand-gradient);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--brand-gradient);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.size-info {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  font-size: 14px;
}

.size-item {
  padding: 10px 14px;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  flex: 1;
  transition: background var(--transition);
}

.size-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.size-value {
  font-size: 18px;
  font-weight: 700;
}

.size-value.smaller {
  color: #22c55e;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition), transform var(--transition);
  width: 100%;
  margin-bottom: 8px;
}

.btn:hover {
  opacity: 0.9;
}

.btn:active {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--brand-gradient);
  color: white;
}

.btn-secondary {
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-back {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  padding: 4px 0;
  margin-bottom: 16px;
  transition: color var(--transition);
}

.btn-back:hover {
  color: var(--brand-start);
}
```

- [ ] **Step 2: Create `js/download.js`**

```js
export function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadZip(files) {
  const zip = new JSZip();
  for (const { name, blob } of files) {
    zip.file(name, blob);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadFile(zipBlob, "compressed_images.zip");
}
```

- [ ] **Step 3: Create `js/compress.js`**

```js
import { createUpload } from "./upload.js";
import { createCompare } from "./compare.js";
import { loadImage, canvasToBlob, formatFileSize } from "./utils.js";
import { downloadFile } from "./download.js";

let cleanup = null;

export function render(container) {
  showUpload(container);
}

function showUpload(container) {
  doCleanup();

  container.innerHTML = `<div class="upload-container"></div>`;
  const uploadArea = container.querySelector(".upload-container");

  createUpload(uploadArea, {
    onFiles: (files) => showWorkspace(container, files),
  });
}

function showWorkspace(container, files) {
  const file = files[0];
  const state = {
    img: null,
    blob: null,
    originalUrl: null,
    compressedUrl: null,
    compare: null,
    rafId: null,
  };

  container.innerHTML = `
    <div class="compress-layout">
      <div class="compress-sidebar">
        <button class="btn-back" id="btn-back">← 重新上传</button>
        <h2>图片压缩</h2>
        <div class="size-info">
          <div class="size-item">
            <div class="size-label">原始大小</div>
            <div class="size-value" id="orig-size">-</div>
          </div>
          <div class="size-item">
            <div class="size-label">压缩后</div>
            <div class="size-value" id="comp-size">-</div>
          </div>
        </div>
        <div class="setting-group">
          <label>质量</label>
          <div class="quality-row">
            <input type="range" min="10" max="100" value="80" id="quality">
            <span class="quality-value" id="quality-val">80%</span>
          </div>
        </div>
        <button class="btn btn-primary" id="btn-download" disabled>⬇ 下载</button>
        <button class="btn btn-secondary" id="btn-back2">← 重新上传</button>
      </div>
      <div class="compress-main" id="preview-area"></div>
    </div>
  `;

  const origSizeEl = container.querySelector("#orig-size");
  const compSizeEl = container.querySelector("#comp-size");
  const qualitySlider = container.querySelector("#quality");
  const qualityVal = container.querySelector("#quality-val");
  const downloadBtn = container.querySelector("#btn-download");
  const previewArea = container.querySelector("#preview-area");

  container.querySelector("#btn-back").addEventListener("click", () => {
    doCleanup();
    showUpload(container);
  });
  container.querySelector("#btn-back2").addEventListener("click", () => {
    doCleanup();
    showUpload(container);
  });

  qualitySlider.addEventListener("input", () => {
    qualityVal.textContent = qualitySlider.value + "%";
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = requestAnimationFrame(() => doCompress());
  });

  downloadBtn.addEventListener("click", () => {
    if (state.blob) {
      const name = file.name.replace(/\.[^.]+$/, "");
      downloadFile(state.blob, `compressed_${name}.jpg`);
    }
  });

  async function doCompress() {
    if (!state.img) return;
    const quality = qualitySlider.value / 100;
    state.blob = await canvasToBlob(state.img, quality);
    if (state.compressedUrl) URL.revokeObjectURL(state.compressedUrl);
    state.compressedUrl = URL.createObjectURL(state.blob);
    state.compare.updateCompressed(state.compressedUrl);
    compSizeEl.textContent = formatFileSize(state.blob.size);
    const ratio = ((1 - state.blob.size / file.size) * 100).toFixed(1);
    compSizeEl.className = "size-value" + (state.blob.size < file.size ? " smaller" : "");
    downloadBtn.disabled = false;
  }

  cleanup = () => {
    if (state.compare) state.compare.destroy();
    if (state.rafId) cancelAnimationFrame(state.rafId);
    if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
    if (state.compressedUrl) URL.revokeObjectURL(state.compressedUrl);
  };

  (async () => {
    origSizeEl.textContent = formatFileSize(file.size);
    state.img = await loadImage(file);
    state.originalUrl = URL.createObjectURL(file);
    state.compare = createCompare(previewArea, state.originalUrl);
    await doCompress();
  })();
}

function doCleanup() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
}

export function destroy() {
  doCleanup();
}
```

- [ ] **Step 4: Verify**

Open browser. Click "图片压缩" card on home page → compress page shows with upload zone. Drag or click to upload a JPG image. After upload:
- Upload zone disappears, replaced by left settings panel + right comparison slider
- Original and compressed file sizes shown
- Drag the comparison slider — left is original, right is compressed
- Move quality slider — compressed preview and file size update in real-time
- Click "下载" — browser downloads compressed JPEG
- Click "← 重新上传" — returns to upload state
- Click navbar "AI 图片工具箱" — returns to home

- [ ] **Step 5: Commit**

```bash
git add css/controls.css js/compress.js js/download.js
git commit -m "feat: compress tool with single image mode, comparison slider, and download"
```

---

### Task 9: Batch Compression Mode

**Files:**
- Create: `css/results.css`
- Modify: `js/compress.js` — replace entire file to add batch mode

- [ ] **Step 1: Create `css/results.css`**

```css
.batch-list {
  list-style: none;
}

.batch-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  margin-bottom: 8px;
  transition: background var(--transition);
}

.batch-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  background: var(--checkerboard);
}

.batch-info {
  flex: 1;
  min-width: 0;
}

.batch-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.batch-sizes {
  font-size: 13px;
  color: var(--text-secondary);
}

.batch-sizes .smaller {
  color: #22c55e;
  font-weight: 600;
}

.batch-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.batch-status.pending {
  background: var(--bg-input);
  color: var(--text-secondary);
}

.batch-status.done {
  background: #dcfce7;
  color: #16a34a;
}

[data-theme="dark"] .batch-status.done {
  background: #052e16;
  color: #4ade80;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: var(--bg-input);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
  transition: background var(--transition);
}

.progress-bar {
  height: 100%;
  background: var(--brand-gradient);
  border-radius: 4px;
  width: 0%;
  transition: width 0.3s ease;
}
```

- [ ] **Step 2: Replace `js/compress.js` with batch-aware version**

```js
import { createUpload } from "./upload.js";
import { createCompare } from "./compare.js";
import { loadImage, canvasToBlob, formatFileSize } from "./utils.js";
import { downloadFile, downloadZip } from "./download.js";

let cleanup = null;

export function render(container) {
  showUpload(container);
}

function showUpload(container) {
  doCleanup();
  container.innerHTML = `<div class="upload-container"></div>`;
  const uploadArea = container.querySelector(".upload-container");
  createUpload(uploadArea, {
    onFiles: (files) => {
      if (files.length === 1) {
        showSingleMode(container, files[0]);
      } else {
        showBatchMode(container, files);
      }
    },
  });
}

// ── Single Image Mode ──

function showSingleMode(container, file) {
  const state = {
    img: null,
    blob: null,
    originalUrl: null,
    compressedUrl: null,
    compare: null,
    rafId: null,
  };

  container.innerHTML = `
    <div class="compress-layout">
      <div class="compress-sidebar">
        <button class="btn-back" id="btn-back">← 重新上传</button>
        <h2>图片压缩</h2>
        <div class="size-info">
          <div class="size-item">
            <div class="size-label">原始大小</div>
            <div class="size-value" id="orig-size">-</div>
          </div>
          <div class="size-item">
            <div class="size-label">压缩后</div>
            <div class="size-value" id="comp-size">-</div>
          </div>
        </div>
        <div class="setting-group">
          <label>质量</label>
          <div class="quality-row">
            <input type="range" min="10" max="100" value="80" id="quality">
            <span class="quality-value" id="quality-val">80%</span>
          </div>
        </div>
        <button class="btn btn-primary" id="btn-download" disabled>⬇ 下载</button>
        <button class="btn btn-secondary" id="btn-back2">← 重新上传</button>
      </div>
      <div class="compress-main" id="preview-area"></div>
    </div>
  `;

  const origSizeEl = container.querySelector("#orig-size");
  const compSizeEl = container.querySelector("#comp-size");
  const qualitySlider = container.querySelector("#quality");
  const qualityVal = container.querySelector("#quality-val");
  const downloadBtn = container.querySelector("#btn-download");
  const previewArea = container.querySelector("#preview-area");

  const goBack = () => {
    doCleanup();
    showUpload(container);
  };
  container.querySelector("#btn-back").addEventListener("click", goBack);
  container.querySelector("#btn-back2").addEventListener("click", goBack);

  qualitySlider.addEventListener("input", () => {
    qualityVal.textContent = qualitySlider.value + "%";
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = requestAnimationFrame(() => doCompress());
  });

  downloadBtn.addEventListener("click", () => {
    if (state.blob) {
      const name = file.name.replace(/\.[^.]+$/, "");
      downloadFile(state.blob, `compressed_${name}.jpg`);
    }
  });

  async function doCompress() {
    if (!state.img) return;
    const quality = qualitySlider.value / 100;
    state.blob = await canvasToBlob(state.img, quality);
    if (state.compressedUrl) URL.revokeObjectURL(state.compressedUrl);
    state.compressedUrl = URL.createObjectURL(state.blob);
    state.compare.updateCompressed(state.compressedUrl);
    compSizeEl.textContent = formatFileSize(state.blob.size);
    compSizeEl.className =
      "size-value" + (state.blob.size < file.size ? " smaller" : "");
    downloadBtn.disabled = false;
  }

  cleanup = () => {
    if (state.compare) state.compare.destroy();
    if (state.rafId) cancelAnimationFrame(state.rafId);
    if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
    if (state.compressedUrl) URL.revokeObjectURL(state.compressedUrl);
  };

  (async () => {
    origSizeEl.textContent = formatFileSize(file.size);
    state.img = await loadImage(file);
    state.originalUrl = URL.createObjectURL(file);
    state.compare = createCompare(previewArea, state.originalUrl);
    await doCompress();
  })();
}

// ── Batch Mode ──

function showBatchMode(container, files) {
  const results = files.map((f) => ({
    file: f,
    thumbUrl: URL.createObjectURL(f),
    img: null,
    blob: null,
    status: "pending",
  }));

  container.innerHTML = `
    <div class="compress-layout">
      <div class="compress-sidebar">
        <button class="btn-back" id="btn-back">← 重新上传</button>
        <h2>批量压缩 (${files.length} 张)</h2>
        <div class="setting-group">
          <label>质量</label>
          <div class="quality-row">
            <input type="range" min="10" max="100" value="80" id="quality">
            <span class="quality-value" id="quality-val">80%</span>
          </div>
        </div>
        <button class="btn btn-primary" id="btn-compress">开始压缩</button>
        <div class="progress-bar-container hidden" id="progress-wrap">
          <div class="progress-bar" id="progress-bar"></div>
        </div>
        <p class="hidden" id="progress-text" style="font-size:13px;color:var(--text-secondary);margin-bottom:8px"></p>
        <button class="btn btn-primary hidden" id="btn-download-all">⬇ 全部下载 (ZIP)</button>
        <button class="btn btn-secondary" id="btn-back2">← 重新上传</button>
      </div>
      <div class="compress-main">
        <ul class="batch-list" id="batch-list">
          ${results
            .map(
              (r, i) => `
            <li class="batch-item" data-index="${i}">
              <img class="batch-thumb" src="${r.thumbUrl}" alt="${r.file.name}">
              <div class="batch-info">
                <div class="batch-name">${r.file.name}</div>
                <div class="batch-sizes">
                  <span>${formatFileSize(r.file.size)}</span>
                  <span id="comp-size-${i}"></span>
                </div>
              </div>
              <span class="batch-status pending" id="status-${i}">待压缩</span>
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
    </div>
  `;

  const qualitySlider = container.querySelector("#quality");
  const qualityVal = container.querySelector("#quality-val");
  const compressBtn = container.querySelector("#btn-compress");
  const progressWrap = container.querySelector("#progress-wrap");
  const progressBar = container.querySelector("#progress-bar");
  const progressText = container.querySelector("#progress-text");
  const downloadAllBtn = container.querySelector("#btn-download-all");

  const goBack = () => {
    doCleanup();
    showUpload(container);
  };
  container.querySelector("#btn-back").addEventListener("click", goBack);
  container.querySelector("#btn-back2").addEventListener("click", goBack);

  qualitySlider.addEventListener("input", () => {
    qualityVal.textContent = qualitySlider.value + "%";
  });

  compressBtn.addEventListener("click", async () => {
    compressBtn.disabled = true;
    progressWrap.classList.remove("hidden");
    progressText.classList.remove("hidden");
    const quality = qualitySlider.value / 100;

    for (let i = 0; i < results.length; i++) {
      progressText.textContent = `正在压缩 ${i + 1} / ${results.length}...`;
      progressBar.style.width = `${((i + 1) / results.length) * 100}%`;

      const r = results[i];
      if (!r.img) {
        r.img = await loadImage(r.file);
      }
      r.blob = await canvasToBlob(r.img, quality);

      const sizeEl = container.querySelector(`#comp-size-${i}`);
      const statusEl = container.querySelector(`#status-${i}`);
      sizeEl.innerHTML = ` → <span class="smaller">${formatFileSize(r.blob.size)}</span>`;
      statusEl.textContent = "已完成";
      statusEl.className = "batch-status done";
      r.status = "done";
    }

    progressText.textContent = `全部完成！共 ${results.length} 张`;
    downloadAllBtn.classList.remove("hidden");
  });

  downloadAllBtn.addEventListener("click", async () => {
    const zipFiles = results
      .filter((r) => r.blob)
      .map((r) => {
        const name = r.file.name.replace(/\.[^.]+$/, "");
        return { name: `compressed_${name}.jpg`, blob: r.blob };
      });
    await downloadZip(zipFiles);
  });

  cleanup = () => {
    for (const r of results) {
      if (r.thumbUrl) URL.revokeObjectURL(r.thumbUrl);
    }
  };
}

function doCleanup() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
}

export function destroy() {
  doCleanup();
}
```

- [ ] **Step 3: Verify**

Test single image: Upload one image → comparison slider works, quality slider updates, download works.
Test batch: Upload 3-5 images → see result list with thumbnails and "待压缩" status. Click "开始压缩" → progress bar fills, each row updates to "已完成" with compressed size. Click "全部下载" → ZIP downloads. Verify ZIP contains all compressed images.

- [ ] **Step 4: Commit**

```bash
git add css/results.css js/compress.js
git commit -m "feat: batch compression mode with progress bar and ZIP download"
```

---

### Task 10: Responsive Layout

**Files:**
- Create: `css/responsive.css`

- [ ] **Step 1: Create `css/responsive.css`**

```css
@media (max-width: 768px) {
  .navbar {
    padding: 0 16px;
  }

  .navbar-brand {
    font-size: 17px;
  }

  #app {
    padding: 20px 16px;
  }

  .home-title {
    font-size: 24px;
  }

  .home-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }

  .tool-card {
    padding: 24px 16px;
    min-height: 140px;
  }

  .tool-icon {
    font-size: 32px;
  }

  .tool-name {
    font-size: 15px;
  }

  .compress-layout {
    flex-direction: column;
  }

  .compress-sidebar {
    width: 100%;
    position: static;
  }

  .size-info {
    flex-direction: row;
  }

  .upload-zone {
    padding: 40px 16px;
    margin: 20px auto;
  }

  .upload-icon {
    font-size: 36px;
  }

  .compare-wrapper {
    border-radius: var(--radius-sm);
  }
}
```

- [ ] **Step 2: Verify**

Resize browser to mobile width (< 768px). Compress page layout should stack: settings panel on top, preview below. Home page cards should be smaller. Upload zone should adapt. Theme toggle should still work.

- [ ] **Step 3: Commit**

```bash
git add css/responsive.css
git commit -m "feat: responsive layout for mobile (768px breakpoint)"
```

---

### Task 11: Final Integration Check

**Files:**
- Modify: `.gitignore` (add `.superpowers/` if not already present)

- [ ] **Step 1: Verify full flow**

Walk through every user path:
1. Home page loads with gradient card
2. Theme toggle works and persists on refresh
3. Click card → compress page with upload zone
4. Single image: upload → comparison slider → adjust quality → download
5. Multiple images: upload → batch list → compress all → download ZIP
6. "← 重新上传" works in both modes
7. Navbar logo returns to home
8. Mobile responsive at narrow widths
9. Dark mode looks good in all states
10. Invalid files (non-image, >10MB) show inline error

- [ ] **Step 2: Ensure `.gitignore` includes `.superpowers/`**

```gitignore
.superpowers/
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and gitignore"
```
