# AI Image Toolkit Architecture Refactor Design

## Scope

This refactor improves the existing no-framework browser app architecture without changing the runtime model. The project must still run as static files with `index.html`, CDN-only dependencies, and plain HTML/CSS/JavaScript.

The first implementation slice focuses on the two most duplicated local Canvas tools:

- Image compression
- Format conversion

Watermark, crop, AI background removal, and AI enhancement stay functionally unchanged unless a small compatibility edit is required.

## Goals

- Extract shared runtime modules for tool layout, batch processing, Canvas output, and object URL cleanup.
- Reduce duplicated single-image and batch-image control flow in `compress.js` and `convert.js`.
- Make the client-side image processing pipeline easy to explain in a resume: upload validation, Canvas transformation, sequential batch queue, preview, download, and cleanup.
- Preserve current user-visible behavior, route names, CDN usage, CSS structure, and direct static serving.

## Non-Goals

- No framework migration.
- No bundler, package manager, or build step.
- No ES module conversion in this slice, because direct static loading and current global script ordering are part of the project constraints.
- No large visual redesign.
- No AI API provider changes.

## Proposed Architecture

### New Shared Runtime Files

`js/url-store.js`

Manages object URLs created during a page lifecycle.

- `create(blobOrFile)` returns an object URL and tracks it.
- `revoke(url)` revokes one URL and removes it from tracking.
- `revokeAll()` revokes every tracked URL.

Each tool page owns one URL store per active workspace. This avoids scattered cleanup code and makes memory management explicit.

`js/image-pipeline.js`

Contains pure browser image processing helpers.

- `encodeImage(img, options)` handles Canvas creation, optional JPEG white background, `drawImage`, and `canvas.toBlob`.
- `compressImage(img, quality)` calls `encodeImage` with JPEG output.
- `convertImage(img, format, quality)` calls `encodeImage` with the requested MIME type.
- `supportsMimeType(mime)` performs lightweight Canvas MIME support checks for WebP availability.

This keeps Canvas behavior out of page files and preserves the known JPEG transparency fix.

`js/batch-processor.js`

Runs batch jobs sequentially and reports status.

- Accepts a list of items and an async `processItem(item, index)` callback.
- Emits progress through `onItemStart`, `onItemDone`, `onItemError`, and `onComplete`.
- Supports cancellation through a small controller object.
- Uses serial processing to keep memory usage predictable for large images.

`js/tool-shell.js`

Creates repeated tool-page structure.

- Upload state: shared upload container.
- Workspace state: sidebar + preview area layout.
- Standard back-to-upload behavior.

This does not become a full component framework. It is a small helper that removes repeated layout setup and lifecycle cleanup.

### Updated Existing Files

`index.html`

Adds the new shared scripts before page scripts that use them.

`js/compress.js`

Uses:

- `createToolShell`
- `createUrlStore`
- `compressImage`
- `processBatch`

Single-image compression still updates preview on quality changes. Batch compression still uses the current list UI, drag sorting, progress bar, ZIP download, and history entry.

`js/convert.js`

Uses:

- `createToolShell`
- `createUrlStore`
- `convertImage`
- `supportsMimeType`
- `processBatch`

The format conversion UI remains the same. WebP can be disabled if the browser does not support WebP output.

## Data Flow

Single-image flow:

1. `createUpload` validates user files.
2. Tool page creates a workspace and a lifecycle URL store.
3. `loadImage(file)` creates an `HTMLImageElement`.
4. Tool-specific controls call `compressImage` or `convertImage`.
5. The result blob is tracked through `createUrlStore`.
6. Preview and size metadata update.
7. Download uses `downloadFile`.
8. Route changes or re-upload call `revokeAll()`.

Batch flow:

1. `createUpload` validates and returns ordered files.
2. Tool page renders a sortable batch list.
3. User starts processing.
4. `processBatch` loads and processes one file at a time.
5. Each row updates to `processing`, `done`, or `failed`.
6. Completed blobs are packaged by `downloadZip`.
7. Cleanup revokes all tracked thumbnail and preview URLs.

## Error Handling

- Image load failures mark the affected batch row as failed and continue with the next image.
- Canvas encoding failures surface a concise status message and leave download disabled for that item.
- Batch completion reports how many images succeeded and failed.
- Existing AI API error handling is left unchanged in this slice.

## Testing And Verification

Because the app has no build system, verification is browser-based and static-server based.

Manual checks:

- Home route loads.
- Compression single-image path previews and downloads.
- Compression batch path processes multiple files, keeps drag-sorted order, and downloads ZIP.
- Conversion single-image path switches formats and downloads the selected extension.
- Conversion batch path processes multiple files and downloads ZIP.
- Re-upload and route switching revoke page-owned object URLs without console errors.
- Existing watermark, crop, remove background, and enhance routes still render.

Implementation can add small browser-console smoke helpers only if they do not change app behavior.

## Resume Framing

After the refactor, the project can be described as:

- Built a no-framework SPA image toolkit with hash routing and modular page lifecycle management.
- Designed a reusable browser-side Canvas image pipeline for compression and format conversion.
- Implemented sequential batch processing with progress reporting, ZIP export, and explicit object URL memory cleanup.
- Preserved static deployment constraints while improving maintainability and extensibility.
