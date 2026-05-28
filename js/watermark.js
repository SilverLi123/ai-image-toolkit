const watermark = (() => {
  const POSITIONS = [
    { id: "tl", label: "↖" },
    { id: "tc", label: "↑" },
    { id: "tr", label: "↗" },
    { id: "cl", label: "←" },
    { id: "cc", label: "●" },
    { id: "cr", label: "→" },
    { id: "bl", label: "↙" },
    { id: "bc", label: "↓" },
    { id: "br", label: "↘" },
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
        showWorkspace(container, files);
      },
    });
  }

  function showWorkspace(container, files) {
    let aborted = false;
    const results = files.map((f) => ({
      file: f,
      thumbUrl: URL.createObjectURL(f),
      img: null,
      blob: null,
    }));
    const isSingle = files.length === 1;

    container.innerHTML = `
    <div class="compress-layout">
      <div class="compress-sidebar">
        <button class="btn-back" id="btn-back">← 重新上传</button>
        <h2>批量水印${isSingle ? "" : ` (${files.length} 张)`}</h2>
        <div class="setting-group">
          <label>水印文字</label>
          <input class="wm-input" type="text" id="wm-text" value="AI 图片工具箱" placeholder="输入水印文字">
        </div>
        <div class="setting-group">
          <label>位置</label>
          <div class="pos-grid" id="pos-grid">
            ${POSITIONS.map(
              (p) =>
                `<button class="pos-cell${p.id === "br" ? " active" : ""}" data-pos="${p.id}">${p.label}</button>`
            ).join("")}
          </div>
        </div>
        <div class="setting-group">
          <label>透明度</label>
          <div class="quality-row">
            <input type="range" min="10" max="100" value="50" id="wm-opacity">
            <span class="quality-value" id="opacity-val">50%</span>
          </div>
        </div>
        <div class="setting-group">
          <label>大小</label>
          <div class="quality-row">
            <input type="range" min="1" max="10" value="4" id="wm-size">
            <span class="quality-value" id="size-val">4%</span>
          </div>
        </div>
        ${isSingle ? `
          <button class="btn btn-primary" id="btn-download" disabled>⬇ 下载</button>
        ` : `
          <button class="btn btn-primary" id="btn-apply">添加水印</button>
          <div class="progress-bar-container hidden" id="progress-wrap">
            <div class="progress-bar" id="progress-bar"></div>
          </div>
          <p class="hidden" id="progress-text" style="font-size:13px;color:var(--text-secondary);margin-bottom:8px"></p>
          <button class="btn btn-primary hidden" id="btn-download-all">⬇ 全部下载 (ZIP)</button>
        `}
        <button class="btn btn-secondary" id="btn-back2">← 重新上传</button>
      </div>
      <div class="compress-main" id="preview-area"></div>
    </div>
  `;

    const textInput = container.querySelector("#wm-text");
    const posGrid = container.querySelector("#pos-grid");
    const opacitySlider = container.querySelector("#wm-opacity");
    const opacityVal = container.querySelector("#opacity-val");
    const sizeSlider = container.querySelector("#wm-size");
    const sizeVal = container.querySelector("#size-val");
    const previewArea = container.querySelector("#preview-area");

    let selectedPos = "br";
    let rafId = null;

    const goBack = () => {
      doCleanup();
      showUpload(container);
    };
    container.querySelector("#btn-back").addEventListener("click", goBack);
    container.querySelector("#btn-back2").addEventListener("click", goBack);

    posGrid.addEventListener("click", (e) => {
      const cell = e.target.closest(".pos-cell");
      if (!cell) return;
      posGrid.querySelectorAll(".pos-cell").forEach((c) => c.classList.remove("active"));
      cell.classList.add("active");
      selectedPos = cell.dataset.pos;
      updatePreview();
    });

    opacitySlider.addEventListener("input", () => {
      opacityVal.textContent = opacitySlider.value + "%";
      scheduleUpdate();
    });

    sizeSlider.addEventListener("input", () => {
      sizeVal.textContent = sizeSlider.value + "%";
      scheduleUpdate();
    });

    textInput.addEventListener("input", () => {
      scheduleUpdate();
    });

    function scheduleUpdate() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => updatePreview());
    }

    function getOptions() {
      return {
        text: textInput.value || "水印",
        position: selectedPos,
        opacity: opacitySlider.value / 100,
        sizeRatio: sizeSlider.value / 100,
      };
    }

    async function updatePreview() {
      if (!results[0].img) return;
      const opts = getOptions();
      const blob = await drawWatermark(results[0].img, opts);
      if (aborted) return;
      const url = URL.createObjectURL(blob);
      previewArea.innerHTML = `
        <div class="compare">
          <div class="compare-labels">
            <span>水印预览</span>
            <span></span>
          </div>
          <div class="compare-wrapper" style="cursor:default">
            <img class="compare-img" src="${url}" alt="水印预览">
          </div>
        </div>
      `;
      if (isSingle) {
        results[0].blob = blob;
        const dlBtn = container.querySelector("#btn-download");
        if (dlBtn) dlBtn.disabled = false;
      }
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // Single image download
    const dlBtn = container.querySelector("#btn-download");
    if (dlBtn) {
      dlBtn.addEventListener("click", () => {
        if (results[0].blob) {
          const name = results[0].file.name.replace(/\.[^.]+$/, "");
          downloadFile(results[0].blob, `watermarked_${name}.png`);
        }
      });
    }

    // Batch mode
    const applyBtn = container.querySelector("#btn-apply");
    const progressWrap = container.querySelector("#progress-wrap");
    const progressBar = container.querySelector("#progress-bar");
    const progressText = container.querySelector("#progress-text");
    const downloadAllBtn = container.querySelector("#btn-download-all");

    if (applyBtn) {
      applyBtn.addEventListener("click", async () => {
        applyBtn.disabled = true;
        progressWrap.classList.remove("hidden");
        progressText.classList.remove("hidden");
        const opts = getOptions();

        for (let i = 0; i < results.length; i++) {
          if (aborted) return;
          progressText.textContent = `正在处理 ${i + 1} / ${results.length}...`;
          progressBar.style.width = `${((i + 1) / results.length) * 100}%`;

          const r = results[i];
          if (!r.img) r.img = await loadImage(r.file);
          r.blob = await drawWatermark(r.img, opts);
          if (aborted) return;

          const statusEl = container.querySelector(`#status-${i}`);
          if (statusEl) {
            statusEl.textContent = "已完成";
            statusEl.className = "batch-status done";
          }
        }

        progressText.textContent = `全部完成！共 ${results.length} 张`;
        downloadAllBtn.classList.remove("hidden");
      });
    }

    if (downloadAllBtn) {
      downloadAllBtn.addEventListener("click", async () => {
        const zipFiles = results
          .filter((r) => r.blob)
          .map((r) => {
            const name = r.file.name.replace(/\.[^.]+$/, "");
            return { name: `watermarked_${name}.png`, blob: r.blob };
          });
        await downloadZip(zipFiles);
      });
    }

    // Show batch list for multiple files
    if (!isSingle) {
      previewArea.innerHTML = `
        <ul class="batch-list">
          ${results
            .map(
              (r, i) => `
            <li class="batch-item">
              <img class="batch-thumb" src="${r.thumbUrl}" alt="${r.file.name}">
              <div class="batch-info">
                <div class="batch-name">${r.file.name}</div>
              </div>
              <span class="batch-status pending" id="status-${i}">待处理</span>
            </li>
          `
            )
            .join("")}
        </ul>
      `;
    }

    cleanup = () => {
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      for (const r of results) {
        if (r.thumbUrl) URL.revokeObjectURL(r.thumbUrl);
      }
    };

    // Load first image for preview
    (async () => {
      results[0].img = await loadImage(results[0].file);
      if (isSingle) {
        updatePreview();
      }
    })();
  }

  async function drawWatermark(img, opts) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const fontSize = Math.round(img.naturalHeight * opts.sizeRatio);
    ctx.globalAlpha = opts.opacity;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = "middle";

    const pad = fontSize * 1.5;
    const w = canvas.width;
    const h = canvas.height;

    const posMap = {
      tl: { x: pad, y: pad, align: "left" },
      tc: { x: w / 2, y: pad, align: "center" },
      tr: { x: w - pad, y: pad, align: "right" },
      cl: { x: pad, y: h / 2, align: "left" },
      cc: { x: w / 2, y: h / 2, align: "center" },
      cr: { x: w - pad, y: h / 2, align: "right" },
      bl: { x: pad, y: h - pad, align: "left" },
      bc: { x: w / 2, y: h - pad, align: "center" },
      br: { x: w - pad, y: h - pad, align: "right" },
    };

    const pos = posMap[opts.position];
    ctx.textAlign = pos.align;

    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = Math.max(1, fontSize / 20);
    ctx.strokeText(opts.text, pos.x, pos.y);

    ctx.fillStyle = "white";
    ctx.fillText(opts.text, pos.x, pos.y);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
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
