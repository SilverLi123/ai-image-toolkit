import { createUpload } from "./upload.js";
import { createCompare } from "./compare.js";
import { loadImage, canvasToBlob, formatFileSize } from "./utils.js";
import { downloadFile, downloadZip } from "./download.js";

let cleanup = null;
let generation = 0;

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
    const gen = ++generation;
    const quality = qualitySlider.value / 100;
    const blob = await canvasToBlob(state.img, quality);
    if (!blob || gen !== generation) return;
    if (state.compressedUrl) URL.revokeObjectURL(state.compressedUrl);
    state.blob = blob;
    state.compressedUrl = URL.createObjectURL(blob);
    state.compare.updateCompressed(state.compressedUrl);
    compSizeEl.textContent = formatFileSize(blob.size);
    compSizeEl.className =
      "size-value" + (blob.size < file.size ? " smaller" : "");
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
  let aborted = false;
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
      if (aborted) return;
      progressText.textContent = `正在压缩 ${i + 1} / ${results.length}...`;
      progressBar.style.width = `${((i + 1) / results.length) * 100}%`;

      const r = results[i];
      if (!r.img) {
        r.img = await loadImage(r.file);
      }
      r.blob = await canvasToBlob(r.img, quality);
      if (aborted) return;

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
    aborted = true;
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
