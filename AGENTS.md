# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

AI Image Toolkit — a browser-based image processing suite with AI capabilities. All image processing runs locally via Canvas API; only AI background removal calls an external API.

**Target users:** Content creators, e-commerce operators, designers.

**No frameworks.** Pure HTML/CSS/JS. No build tools, no bundler — open `index.html` directly or serve with any static server.

## Running the Project

No build step. Serve the root directory with any static HTTP server:
```bash
# Python
python -m http.server 8080
# Node
npx serve .
```

For AI background removal, the user must provide their own API key (remove.bg or GLM vision model). API keys are entered in the UI, not stored in code.

## Repository Workflow

After completing requested changes in this repository, run the relevant smoke tests, commit the intended changes, and push the current branch unless the user explicitly asks not to.

## Architecture

Single-page app with client-side routing (`js/router.js`). Each tool is a "page" managed by the router.

```
index.html
├── css/          # Split by concern: variables, base, navbar, home, upload, preview, controls, responsive
├── js/
│   ├── router.js       # Client-side page routing
│   ├── theme.js        # Dark/light mode toggle
│   ├── upload.js       # Shared drag-and-drop + file picker component (reused by all tools)
│   ├── compress.js     # Canvas toBlob with quality param
│   ├── convert.js      # Format conversion (reuses compress logic, different MIME type)
│   ├── watermark.js    # Canvas fillText with position/opacity/size controls
│   ├── remove-bg.js    # External API call + transparent PNG handling
│   ├── compare.js      # Before/after comparison slider (CSS clip-path + drag)
│   ├── download.js     # Single download + JSZip batch packaging
│   └── utils.js        # Shared Canvas helpers
└── assets/icons/       # SVG tool icons
```

### Key Design Patterns

- **Shared upload component** (`upload.js`): All four tools reuse the same drag-and-drop file picker. Supports JPG/PNG/WebP, max 10MB per file, max 10 files.
- **Canvas pipeline core**: Every tool follows `new Image() → ctx.drawImage() → canvas.toBlob()`. Compress is the base; convert just changes MIME type; watermark adds fillText on top.
- **Comparison slider** (`compare.js`): CSS `clip-path` + drag events. Must handle both `mousemove` and `touchmove`.
- **Batch processing**: Process images sequentially with progress bar. Call `URL.revokeObjectURL()` after each to avoid memory leaks.

## Implementation Order

1. Home page + shared upload component
2. Image compression (core tool — everything else builds on this)
3. Format conversion (reuses compression, changes MIME type)
4. Batch watermark (adds Canvas text rendering)
5. AI background removal (requires external API)
6. Dark mode + responsive + error handling

## Known Pitfalls

- **Canvas JPEG transparency**: Must `fillRect` white background before `drawImage`, or transparent areas turn black in JPEG output.
- **`drawImage` timing**: All Canvas operations must run inside `img.onload` callback.
- **Large image lag**: Use `setTimeout` for batch processing or Web Workers for very large images.
- **Safari WebP**: Check `canvas.toBlob` support for `image/webp` before offering WebP conversion.
- **Mobile drag**: Comparison slider must listen to `touchmove` + `e.touches[0].clientX`, not just `mousemove`.
- **Memory leaks**: Revoke `URL.createObjectURL` URLs after processing each image in batch mode.
- **ZIP Chinese filenames**: JSZip uses UTF-8; avoid special characters in filenames.
- **Drag-drop file order**: Use `DataTransferItemList` to preserve original file order.

## External Dependencies (CDN only)

- **JSZip** — batch ZIP packaging for multi-file downloads
- **AI API** — remove.bg API or GLM vision model for background removal
