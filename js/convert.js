const convert = (() => {
  const FORMATS = [IMAGE_FORMATS.jpg, IMAGE_FORMATS.png, IMAGE_FORMATS.webp];

  let shell = null;
  let cleanup = null;
  let generation = 0;

  function render(container) {
    shell = createToolShell(container, {
      uploadOptions: {
        onFiles: (files) => {
          if (files.length === 1) {
            showSingleMode(files[0]);
          } else {
            showBatchMode(files);
          }
        },
      },
      onReset: doCleanup,
    });
    shell.showUpload();
  }

  function showSingleMode(file) {
    doCleanup();

    const urls = createUrlStore();
    const srcFormat = getFormatLabel(file.type);
    const state = {
      img: null,
      blob: null,
      previewUrl: null,
      rafId: null,
    };

    let targetFormat = getDefaultFormat();

    const { sidebar, main: previewArea } = shell.showWorkspace(`
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
          ${renderFormatButtons(targetFormat)}
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
    `);

    const origInfoEl = sidebar.querySelector("#orig-info");
    const compInfoEl = sidebar.querySelector("#comp-info");
    const formatBtns = sidebar.querySelector("#format-btns");
    const qualityGroup = sidebar.querySelector("#quality-group");
    const qualitySlider = sidebar.querySelector("#quality");
    const qualityVal = sidebar.querySelector("#quality-val");
    const downloadBtn = sidebar.querySelector("#btn-download");

    const goBack = () => shell.showUpload();
    sidebar.querySelector("#btn-back").addEventListener("click", goBack);
    sidebar.querySelector("#btn-back2").addEventListener("click", goBack);

    formatBtns.addEventListener("click", (event) => {
      const btn = event.target.closest(".format-btn");
      if (!btn || btn.disabled) return;

      formatBtns.querySelectorAll(".format-btn").forEach((item) => item.classList.remove("active"));
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
      if (!state.blob) return;
      const format = IMAGE_FORMATS[targetFormat];
      addHistory("格式转换", file.name, formatFileSize(file.size), formatFileSize(state.blob.size));
      const name = file.name.replace(/\.[^.]+$/, "");
      downloadFile(state.blob, `converted_${name}.${format.extension}`);
    });

    async function doConvert() {
      if (!state.img) return;
      const gen = ++generation;
      const format = IMAGE_FORMATS[targetFormat];
      const quality = targetFormat === "jpg" ? qualitySlider.value / 100 : undefined;

      try {
        const blob = await convertImage(state.img, targetFormat, quality);
        if (gen !== generation) return;

        if (state.previewUrl) urls.revoke(state.previewUrl);
        state.blob = blob;
        state.previewUrl = urls.create(blob);
        previewArea.innerHTML = `
          <div class="compare">
            <div class="compare-labels">
              <span>预览</span>
              <span>${format.label.toUpperCase()}</span>
            </div>
            <div class="compare-wrapper" style="cursor:default">
              <img class="compare-img" src="${state.previewUrl}" alt="转换后">
            </div>
          </div>
        `;
        compInfoEl.textContent = `${formatFileSize(blob.size)} (${format.label})`;
        compInfoEl.className = "size-value" + (blob.size < file.size ? " smaller" : "");
        downloadBtn.disabled = false;
      } catch (error) {
        if (gen !== generation) return;
        compInfoEl.textContent = "转换失败";
        compInfoEl.className = "size-value";
        downloadBtn.disabled = true;
      }
    }

    cleanup = () => {
      generation++;
      if (state.rafId) cancelAnimationFrame(state.rafId);
      urls.revokeAll();
    };

    (async () => {
      try {
        origInfoEl.textContent = `${formatFileSize(file.size)} (${srcFormat})`;
        state.img = await loadImage(file);
        qualityGroup.classList.toggle("hidden", targetFormat !== "jpg");
        await doConvert();
      } catch (error) {
        previewArea.innerHTML = `<p class="upload-error" style="display:block">图片加载失败：${error.message}</p>`;
      }
    })();
  }

  function showBatchMode(files) {
    doCleanup();

    const urls = createUrlStore();
    const controller = createBatchController();
    let targetFormat = getDefaultFormat();
    const results = files.map((file) => ({
      file,
      thumbUrl: urls.create(file),
      img: null,
      blob: null,
      row: null,
    }));

    const { sidebar, main } = shell.showWorkspace(`
      <button class="btn-back" id="btn-back">← 重新上传</button>
      <h2>批量转换 (${files.length} 张)</h2>
      <div class="setting-group">
        <label>目标格式</label>
        <div class="format-btns" id="format-btns">
          ${renderFormatButtons(targetFormat)}
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
    `);

    main.innerHTML = `
      <ul class="batch-list" id="batch-list">
        ${results
          .map(
            (result, index) => `
          <li class="batch-item" data-index="${index}" draggable="true">
            <img class="batch-thumb" src="${result.thumbUrl}" alt="${result.file.name}">
            <div class="batch-info">
              <div class="batch-name">${result.file.name}</div>
              <div class="batch-sizes">
                <span>${formatFileSize(result.file.size)}</span>
                <span class="result-size"></span>
              </div>
            </div>
            <span class="batch-status pending">待转换</span>
          </li>
        `
          )
          .join("")}
      </ul>
    `;

    main.querySelectorAll(".batch-item").forEach((row, index) => {
      results[index].row = row;
    });

    const formatBtns = sidebar.querySelector("#format-btns");
    const qualityGroup = sidebar.querySelector("#quality-group");
    const qualitySlider = sidebar.querySelector("#quality");
    const qualityVal = sidebar.querySelector("#quality-val");
    const convertBtn = sidebar.querySelector("#btn-convert");
    const progressWrap = sidebar.querySelector("#progress-wrap");
    const progressBar = sidebar.querySelector("#progress-bar");
    const progressText = sidebar.querySelector("#progress-text");
    const downloadAllBtn = sidebar.querySelector("#btn-download-all");
    const batchList = main.querySelector("#batch-list");

    enableDragSort(batchList, (oldIdx, newIdx) => {
      const item = results.splice(oldIdx, 1)[0];
      results.splice(newIdx, 0, item);
    });

    const goBack = () => shell.showUpload();
    sidebar.querySelector("#btn-back").addEventListener("click", goBack);
    sidebar.querySelector("#btn-back2").addEventListener("click", goBack);

    formatBtns.addEventListener("click", (event) => {
      const btn = event.target.closest(".format-btn");
      if (!btn || btn.disabled) return;

      formatBtns.querySelectorAll(".format-btn").forEach((item) => item.classList.remove("active"));
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

      const format = IMAGE_FORMATS[targetFormat];
      const quality = targetFormat === "jpg" ? qualitySlider.value / 100 : undefined;
      await processBatch(results, {
        controller,
        onItemStart: (result, index) => {
          progressText.textContent = `正在转换 ${index + 1} / ${results.length}...`;
          progressBar.style.width = `${((index + 1) / results.length) * 100}%`;
          setRowStatus(result, "processing", "处理中");
        },
        processItem: async (result) => {
          if (!result.img) result.img = await loadImage(result.file);
          result.blob = await convertImage(result.img, targetFormat, quality);
          return result.blob;
        },
        onItemDone: (result, blob) => {
          const sizeEl = result.row.querySelector(".result-size");
          sizeEl.innerHTML = ` → <span class="smaller">${formatFileSize(blob.size)} (${format.label})</span>`;
          setRowStatus(result, "done", "已完成");
        },
        onItemError: (result) => {
          result.blob = null;
          setRowStatus(result, "error", "失败");
        },
        onComplete: ({ succeeded, failed, cancelled }) => {
          if (cancelled) return;
          progressText.textContent = failed
            ? `完成 ${succeeded} 张，失败 ${failed} 张`
            : `全部完成！共 ${succeeded} 张`;
          if (succeeded > 0) downloadAllBtn.classList.remove("hidden");
          addHistory("批量转换", files.length + " 张图片", "-", "-");
        },
      });
    });

    downloadAllBtn.addEventListener("click", async () => {
      const format = IMAGE_FORMATS[targetFormat];
      const zipFiles = results
        .filter((result) => result.blob)
        .map((result) => {
          const name = result.file.name.replace(/\.[^.]+$/, "");
          return { name: `converted_${name}.${format.extension}`, blob: result.blob };
        });
      await downloadZip(zipFiles);
    });

    cleanup = () => {
      controller.cancel();
      urls.revokeAll();
    };
  }

  function renderFormatButtons(activeFormat) {
    return FORMATS.map((format) => {
      const disabled = !supportsMimeType(format.mime);
      const classes = ["format-btn"];
      if (format.id === activeFormat) classes.push("active");
      return `
        <button class="${classes.join(" ")}" data-format="${format.id}"${disabled ? " disabled title=\"当前浏览器不支持该格式输出\"" : ""}>
          ${format.label}
        </button>
      `;
    }).join("");
  }

  function getDefaultFormat() {
    return supportsMimeType(IMAGE_FORMATS.webp.mime) ? "webp" : "jpg";
  }

  function getFormatLabel(mime) {
    const format = FORMATS.find((item) => item.mime === mime);
    return format ? format.label : "???";
  }

  function setRowStatus(result, status, text) {
    const statusEl = result.row.querySelector(".batch-status");
    statusEl.textContent = text;
    statusEl.className = `batch-status ${status}`;
  }

  function doCleanup() {
    if (!cleanup) return;
    cleanup();
    cleanup = null;
  }

  function destroy() {
    doCleanup();
    if (shell) {
      shell.destroy();
      shell = null;
    }
  }

  return { render, destroy };
})();
