# Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the core local image tools into reusable runtime modules while preserving the no-framework static app model.

**Architecture:** Add small global-script helpers for object URL lifecycle, Canvas encoding, batch processing, and tool page layout. Migrate `compress.js` and `convert.js` onto those helpers first because they share the most behavior and define the reusable local image pipeline.

**Tech Stack:** Plain HTML, CSS, JavaScript, Canvas API, JSZip CDN, hash router.

---

## File Structure

- Create `js/url-store.js`: page-owned object URL registry with `create`, `revoke`, and `revokeAll`.
- Create `js/image-pipeline.js`: Canvas encoding helpers for compression, conversion, JPEG white background, and MIME support checks.
- Create `js/batch-processor.js`: serial batch task runner with progress, error, completion, and cancellation callbacks.
- Create `js/tool-shell.js`: shared upload/workspace layout helper for existing `.compress-layout` UI.
- Modify `index.html`: load the new shared scripts before page scripts.
- Modify `js/compress.js`: use shared shell, URL store, image pipeline, and batch runner.
- Modify `js/convert.js`: use shared shell, URL store, image pipeline, MIME support check, and batch runner.

## Task 1: Shared Object URL Lifecycle

**Files:**
- Create: `js/url-store.js`
- Modify: `index.html`

- [ ] Create `createUrlStore()` with:
  - `create(source)` that calls `URL.createObjectURL(source)`, tracks the URL, and returns it.
  - `revoke(url)` that revokes one tracked URL.
  - `revokeAll()` that revokes every tracked URL and clears the set.
- [ ] Add `<script src="js/url-store.js"></script>` before existing page scripts in `index.html`.
- [ ] Verify in the browser console that `typeof createUrlStore === "function"`.

## Task 2: Shared Canvas Image Pipeline

**Files:**
- Create: `js/image-pipeline.js`
- Modify: `index.html`

- [ ] Create format metadata:
  - `IMAGE_FORMATS.jpg` with `mime: "image/jpeg"` and `extension: "jpg"`.
  - `IMAGE_FORMATS.png` with `mime: "image/png"` and `extension: "png"`.
  - `IMAGE_FORMATS.webp` with `mime: "image/webp"` and `extension: "webp"`.
- [ ] Implement `encodeImage(img, options)`:
  - Create a Canvas matching `img.naturalWidth` and `img.naturalHeight`.
  - Fill white before drawing when output MIME is JPEG.
  - Resolve with the blob from `canvas.toBlob`.
  - Reject if `toBlob` returns a null blob.
- [ ] Implement `compressImage(img, quality)` as JPEG output.
- [ ] Implement `convertImage(img, formatId, quality)` using `IMAGE_FORMATS`.
- [ ] Implement `supportsMimeType(mime)` by checking `canvas.toDataURL(mime).startsWith("data:" + mime)`.
- [ ] Add `<script src="js/image-pipeline.js"></script>` before page scripts in `index.html`.
- [ ] Verify in the browser console that `typeof compressImage === "function"` and `typeof convertImage === "function"`.

## Task 3: Shared Batch Processor

**Files:**
- Create: `js/batch-processor.js`
- Modify: `index.html`

- [ ] Create `createBatchController()` with `cancel()` and `get cancelled()`.
- [ ] Create `processBatch(items, options)`:
  - Iterate items sequentially.
  - Stop if the controller is cancelled.
  - Call `onItemStart(item, index)`.
  - Await `processItem(item, index)`.
  - Call `onItemDone(item, result, index)` on success.
  - Call `onItemError(item, error, index)` on failure and continue.
  - Call `onComplete({ total, succeeded, failed, cancelled })` at the end.
- [ ] Add `<script src="js/batch-processor.js"></script>` before page scripts in `index.html`.
- [ ] Verify in the browser console that `typeof processBatch === "function"`.

## Task 4: Shared Tool Shell

**Files:**
- Create: `js/tool-shell.js`
- Modify: `index.html`

- [ ] Implement `createToolShell(container, options)`:
  - Render upload state with `<div class="upload-container"></div>`.
  - Call existing `createUpload`.
  - Render workspace state with existing `.compress-layout`, `.compress-sidebar`, and `.compress-main` classes.
  - Provide `sidebar`, `main`, `showUpload`, `showWorkspace`, and `destroy` methods.
  - Run `onReset` when returning to upload.
- [ ] Add `<script src="js/tool-shell.js"></script>` before page scripts in `index.html`.
- [ ] Verify in the browser console that `typeof createToolShell === "function"`.

## Task 5: Refactor Compression Tool

**Files:**
- Modify: `js/compress.js`

- [ ] Replace local upload/workspace setup with `createToolShell`.
- [ ] Use `createUrlStore` for original, compressed, and thumbnail URLs.
- [ ] Replace direct `canvasToBlob` calls with `compressImage`.
- [ ] Replace manual batch loop with `processBatch`.
- [ ] Keep current UI text, quality slider behavior, comparison slider, drag sorting, history entries, and ZIP downloads.
- [ ] Verify:
  - Single upload shows comparison preview and download.
  - Quality slider updates output size.
  - Batch upload processes sequentially and enables ZIP download.
  - Re-upload clears previous state without console errors.

## Task 6: Refactor Conversion Tool

**Files:**
- Modify: `js/convert.js`

- [ ] Replace local upload/workspace setup with `createToolShell`.
- [ ] Use `createUrlStore` for preview and thumbnail URLs.
- [ ] Replace direct `canvasToBlob` calls with `convertImage`.
- [ ] Disable WebP format button if `supportsMimeType("image/webp")` is false.
- [ ] Replace manual batch loop with `processBatch`.
- [ ] Keep current UI text, format switching, JPG quality control, drag sorting, history entries, and ZIP downloads.
- [ ] Verify:
  - Single upload converts to selected format and downloads with the right extension.
  - JPG quality slider updates output.
  - Batch upload processes sequentially and enables ZIP download.
  - Re-upload clears previous state without console errors.

## Task 7: Regression Check

**Files:**
- No code changes unless a regression is found.

- [ ] Run a static server with `python -m http.server 8080`.
- [ ] Open `http://localhost:8080`.
- [ ] Check routes:
  - `#/`
  - `#/compress`
  - `#/convert`
  - `#/watermark`
  - `#/removebg`
  - `#/crop`
  - `#/enhance`
- [ ] Confirm there are no console errors on initial route render.
- [ ] Stop the static server after verification.

## Self-Review

- Spec coverage: shared URL lifecycle, Canvas pipeline, batch runner, tool shell, compression refactor, conversion refactor, script loading, and route regression are all covered.
- Placeholder scan: no placeholders or deferred implementation notes remain.
- Type consistency: planned global function names match across tasks and consuming files.
