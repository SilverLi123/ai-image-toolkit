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
