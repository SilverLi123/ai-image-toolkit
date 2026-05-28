const convert = (() => {
  const FORMATS = [
    { id: "jpg", label: "JPG", mime: "image/jpeg" },
    { id: "png", label: "PNG", mime: "image/png" },
    { id: "webp", label: "WebP", mime: "image/webp" },
  ];

  let cleanup = null;

  function render(container) {
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
    const srcFormat = getFormatLabel(file.type);
    const state = {
      img: null,
      blob: null,
      previewUrl: null,
      rafId: null,
    };

    container.innerHTML = `
    <div class="compress-layout">
      <div class="compress-sidebar">
        <button class="btn-back" id="btn-back">← 重新上传</button>
        <h2>格式转换</h2>
        <div class="size-info">
          <div class="size-item">
            <div class="size-label">原始</div>
            <div class="size-value" id="orig-info">-</div>
          </div>
          <div class="size-item">
            <div class="size-label">转换后</div>
            <div class="size-value" id="comp-info">-</div>
          </div>
        </div>
        <div class="setting-group">
          <label>目标格式</label>
          <div class="format-btns" id="format-btns">
            ${FORMATS.map(
              (f) =>
                `<button class="format-btn${f.id === "webp" ? " active" : ""}" data-format="${f.id}">${f.label}</button>`
            ).join("")}
          </div>
        </div>
        <div class="setting-group hidden" id="quality-group">
          <label>JPG 质量</label>
          <div class="quality-row">
            <input type="range" min="10" max="100" value="90" id="quality">
            <span class="quality-value" id="quality-val">90%</span>
          </div>
        </div>
        <button class="btn btn-primary" id="btn-download" disabled>⬇ 下载</button>
        <button class="btn btn-secondary" id="btn-back2">← 重新上传</button>
      </div>
      <div class="compress-main" id="preview-area"></div>
    </div>
  `;

    const origInfoEl = container.querySelector("#orig-info");
    const compInfoEl = container.querySelector("#comp-info");
    const formatBtns = container.querySelector("#format-btns");
    const qualityGroup = container.querySelector("#quality-group");
    const qualitySlider = container.querySelector("#quality");
    const qualityVal = container.querySelector("#quality-val");
    const downloadBtn = container.querySelector("#btn-download");
    const previewArea = container.querySelector("#preview-area");

    let targetFormat = "webp";

    const goBack = () => {
      doCleanup();
      showUpload(container);
    };
    container.querySelector("#btn-back").addEventListener("click", goBack);
    container.querySelector("#btn-back2").addEventListener("click", goBack);

    formatBtns.addEventListener("click", (e) => {
      const btn = e.target.closest(".format-btn");
      if (!btn) return;
      formatBtns.querySelectorAll(".format-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      targetFormat = btn.dataset.format;
      qualityGroup.classList.toggle("hidden", targetFormat !== "jpg");
      doConvert();
    });

    qualitySlider.addEventListener("input", () => {
      qualityVal.textContent = qualitySlider.value + "%";
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.rafId = requestAnimationFrame(() => doConvert());
    });

    downloadBtn.addEventListener("click", () => {
      if (state.blob) {
        addHistory('格式转换', file.name, formatFileSize(file.size), formatFileSize(state.blob.size));
        const name = file.name.replace(/\.[^.]+$/, "");
        downloadFile(state.blob, `converted_${name}.${targetFormat}`);
      }
    });

    async function doConvert() {
      if (!state.img) return;
      const fmt = FORMATS.find((f) => f.id === targetFormat);
      const quality = targetFormat === "jpg" ? qualitySlider.value / 100 : undefined;
      const blob = await canvasToBlob(state.img, quality, fmt.mime);
      if (!blob) return;
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      state.blob = blob;
      state.previewUrl = URL.createObjectURL(blob);
      previewArea.innerHTML = `
        <div class="compare">
          <div class="compare-labels">
            <span>预览</span>
            <span>${fmt.label.toUpperCase()}</span>
          </div>
          <div class="compare-wrapper" style="cursor:default">
            <img class="compare-img" src="${state.previewUrl}" alt="转换后">
          </div>
        </div>
      `;
      compInfoEl.textContent = `${formatFileSize(blob.size)} (${fmt.label})`;
      compInfoEl.className = "size-value" + (blob.size < file.size ? " smaller" : "");
      downloadBtn.disabled = false;
    }

    cleanup = () => {
      if (state.rafId) cancelAnimationFrame(state.rafId);
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    };

    (async () => {
      origInfoEl.textContent = `${formatFileSize(file.size)} (${srcFormat})`;
      state.img = await loadImage(file);
      qualityGroup.classList.add("hidden");
      await doConvert();
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
    }));

    container.innerHTML = `
    <div class="compress-layout">
      <div class="compress-sidebar">
        <button class="btn-back" id="btn-back">← 重新上传</button>
        <h2>批量转换 (${files.length} 张)</h2>
        <div class="setting-group">
          <label>目标格式</label>
          <div class="format-btns" id="format-btns">
            ${FORMATS.map(
              (f) =>
                `<button class="format-btn${f.id === "webp" ? " active" : ""}" data-format="${f.id}">${f.label}</button>`
            ).join("")}
          </div>
        </div>
        <div class="setting-group hidden" id="quality-group">
          <label>JPG 质量</label>
          <div class="quality-row">
            <input type="range" min="10" max="100" value="90" id="quality">
            <span class="quality-value" id="quality-val">90%</span>
          </div>
        </div>
        <button class="btn btn-primary" id="btn-convert">开始转换</button>
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
              <span class="batch-status pending" id="status-${i}">待转换</span>
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
    </div>
  `;

    const formatBtns = container.querySelector("#format-btns");
    const qualityGroup = container.querySelector("#quality-group");
    const qualitySlider = container.querySelector("#quality");
    const qualityVal = container.querySelector("#quality-val");
    const convertBtn = container.querySelector("#btn-convert");
    const progressWrap = container.querySelector("#progress-wrap");
    const progressBar = container.querySelector("#progress-bar");
    const progressText = container.querySelector("#progress-text");
    const downloadAllBtn = container.querySelector("#btn-download-all");

    const batchList = container.querySelector("#batch-list");
    enableDragSort(batchList, (oldIdx, newIdx) => {
      const item = results.splice(oldIdx, 1)[0];
      results.splice(newIdx, 0, item);
    });

    let targetFormat = "webp";

    const goBack = () => {
      doCleanup();
      showUpload(container);
    };
    container.querySelector("#btn-back").addEventListener("click", goBack);
    container.querySelector("#btn-back2").addEventListener("click", goBack);

    formatBtns.addEventListener("click", (e) => {
      const btn = e.target.closest(".format-btn");
      if (!btn) return;
      formatBtns.querySelectorAll(".format-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      targetFormat = btn.dataset.format;
      qualityGroup.classList.toggle("hidden", targetFormat !== "jpg");
    });

    qualitySlider.addEventListener("input", () => {
      qualityVal.textContent = qualitySlider.value + "%";
    });

    convertBtn.addEventListener("click", async () => {
      convertBtn.disabled = true;
      progressWrap.classList.remove("hidden");
      progressText.classList.remove("hidden");
      const fmt = FORMATS.find((f) => f.id === targetFormat);
      const quality = targetFormat === "jpg" ? qualitySlider.value / 100 : undefined;

      for (let i = 0; i < results.length; i++) {
        if (aborted) return;
        progressText.textContent = `正在转换 ${i + 1} / ${results.length}...`;
        progressBar.style.width = `${((i + 1) / results.length) * 100}%`;

        const r = results[i];
        if (!r.img) {
          r.img = await loadImage(r.file);
        }
        r.blob = await canvasToBlob(r.img, quality, fmt.mime);
        if (aborted) return;

        const sizeEl = container.querySelector(`#comp-size-${i}`);
        const statusEl = container.querySelector(`#status-${i}`);
        sizeEl.innerHTML = ` → <span class="smaller">${formatFileSize(r.blob.size)} (${fmt.label})</span>`;
        statusEl.textContent = "已完成";
        statusEl.className = "batch-status done";
      }

      progressText.textContent = `全部完成！共 ${results.length} 张`;
      downloadAllBtn.classList.remove("hidden");
      addHistory('批量转换', files.length + ' 张图片', '-', '-');
    });

    downloadAllBtn.addEventListener("click", async () => {
      const fmt = FORMATS.find((f) => f.id === targetFormat);
      const zipFiles = results
        .filter((r) => r.blob)
        .map((r) => {
          const name = r.file.name.replace(/\.[^.]+$/, "");
          return { name: `converted_${name}.${fmt.id}`, blob: r.blob };
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

  function getFormatLabel(mime) {
    const map = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP" };
    return map[mime] || "???";
  }

  function doCleanup() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }

  function destroy() {
    doCleanup();
  }

  return { render, destroy };
})();
