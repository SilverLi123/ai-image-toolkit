# AI Image Toolkit MVP Design

## Scope

MVP delivers: home page (tool cards), image compression tool, and base architecture (hash router, shared upload component, dark/light theme toggle). Format conversion, batch watermark, and AI background removal are post-MVP.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | MVP first (compress only) | Compress is the core Canvas pipeline that all other tools build on |
| Visual style | Gradient cards (Canva-like) | Colorful cards on white background, each tool gets its own gradient |
| Compress UX | Comparison slider | Squoosh-style drag handle, real-time quality feedback |
| Batch mode | Unified quality setting | All images share one quality slider, compress all at once, result list + batch download |
| Dark mode | Included in MVP | CSS variables from day one, two color sets, toggle in navbar |
| Architecture | Hash routing + JS rendering | Each page module exports render()/destroy(), router maps hash path to module |

## File Structure

```
04-ai-image-toolkit/
├── index.html              # Shell only: navbar + #app container + CDN refs + all <link> CSS
├── css/
│   ├── variables.css       # CSS custom properties: light + dark sets
│   ├── base.css            # Reset, body, global typography
│   ├── navbar.css          # Top nav bar
│   ├── home.css            # Tool card grid with gradient backgrounds
│   ├── upload.css          # Dashed-border drag zone, hover states
│   ├── compare.css         # Comparison slider, checkerboard background
│   ├── controls.css        # Range sliders, buttons, settings panel
│   ├── results.css         # Batch result thumbnail list
│   └── responsive.css      # 768px breakpoint, left-right → top-bottom stacking
├── js/
│   ├── main.js             # Entry: init router, theme, listen hashchange
│   ├── router.js           # Hash router, path → module map
│   ├── theme.js            # Dark/light toggle, localStorage persistence
│   ├── upload.js           # Shared upload component (drag + click, validation)
│   ├── home.js             # Home page: tool card grid
│   ├── compress.js         # Compression tool page
│   ├── compare.js          # Comparison slider component
│   ├── download.js         # Single file download + JSZip batch packaging
│   └── utils.js            # loadImage(), canvasToBlob() helpers
└── assets/
    └── icons/              # SVG tool icons
```

## Router & Page Lifecycle

Route map in `router.js`:

```js
const routes = {
  '':        home,
  'compress': compress,
  // Future tools added here
};
```

Each page module exports:
- `render(container)` — inject HTML into `#app` and bind events
- `destroy()` — cleanup event listeners, revoke object URLs

Switch flow: `hashchange` → destroy current page → clear `#app` → look up route → call `render()`.

Unmatched hashes redirect to home. No 404 page, no route animations.

## Shared Components

### Upload (`upload.js`)

`createUpload(options)` returns HTML string + binds events internally.

- Dashed border drag zone + click triggers `<input type="file" multiple>`
- Validation: JPG/PNG/WebP only, 10MB max per file, 10 files max
- Drag-over visual feedback (border color change, icon state)
- Inline error messages for validation failures (no `alert`)
- Calls `onFiles(files: File[])` callback with valid files

### Comparison Slider (`compare.js`)

`createCompare(originalUrl, compressedUrl)` returns HTML + binds events.

- Two overlapping images, top image clipped via `clip-path: inset(0 X% 0 0)`
- Draggable vertical divider to adjust X%
- Listens to both `mouse*` and `touch*` events
- Labels: "原图" top-left, "压缩后" top-right

### Download (`download.js`)

- `downloadFile(blob, filename)` — creates temporary `<a>` element, triggers click
- `downloadZip(files: {name, blob}[])` — JSZip packages and downloads

## CSS Architecture & Theme

### Variables (`variables.css`)

Light theme on `:root`, dark theme on `[data-theme="dark"]`:

| Variable | Light | Dark |
|----------|-------|------|
| `--brand-start` | #667eea | #667eea (unchanged) |
| `--brand-end` | #764ba2 | #764ba2 (unchanged) |
| `--bg-primary` | #ffffff | #0f0f1a |
| `--bg-card` | #f5f5f7 | #1a1a2e |
| `--bg-upload` | #fafafa | #16162a |
| `--text-primary` | #1a1a1a | #f0f0f0 |
| `--text-secondary` | #6b7280 | #9ca3af |
| `--border-color` | #e5e7eb | #2d2d4a |

Brand gradient colors stay constant across themes as a visual anchor.

### Theme Toggle (`theme.js`)

- Toggle button in navbar
- Sets `data-theme` attribute on `<html>`
- Persists preference in `localStorage`
- On load: read localStorage → apply before first paint

### CSS Loading

All CSS files loaded via `<link>` in `index.html`. No dynamic style injection.

### Responsive Breakpoint

Single breakpoint at 768px. Tool pages switch from left-right split to stacked (settings on top, preview below).

## Compress Tool Data Flow

### Page States

1. **Upload state** — Large centered drag zone fills the main area
2. **Working state** — Upload zone hidden; left panel (settings) + right panel (preview) visible
3. **Reset** — "重新上传" button returns to state 1, clears all data

### Layout (Working State)

```
┌─────────────┬────────────────────────┐
│  Settings    │  Preview               │
│             │                        │
│  Quality     │  Comparison slider     │
│  10% ──●── 100%  (single image)      │
│             │                        │
│  [压缩]      │  or                    │
│             │                        │
│  [全部下载]   │  Result list (batch)   │
│             │  thumb | size → size    │
│             │  [download] [preview]   │
└─────────────┴────────────────────────┘
```

### Single Image Flow

1. User drops/selects one image
2. Right panel shows comparison slider (original vs original initially)
3. User drags quality slider → `canvasToBlob(img, quality)` via `requestAnimationFrame` throttle
4. Compressed image and file size update in real-time
5. Download button saves as `compressed_<filename>.jpg`

### Batch Flow

1. User drops/selects multiple images
2. Right panel shows thumbnail list (filename + original size per row)
3. User clicks "开始压缩" → serial `for...of` + `await` loop over all images
4. Progress bar shows N/total
5. Each completed image updates its row with compressed size
6. When all done, "全部下载" button appears → calls `downloadZip()`

### Performance

- Quality slider uses `requestAnimationFrame` to throttle `toBlob` calls
- Batch processing is serial (no parallel) to avoid memory spikes
- Each image's preview URL is `revokeObjectURL`'d after compression, only the compressed blob is retained

## External Dependencies (CDN)

- **JSZip** — batch ZIP packaging
- No other runtime dependencies. All image processing is browser-native Canvas API.
