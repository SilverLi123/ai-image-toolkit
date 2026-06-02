const compress = (() => {
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
    const state = {
      img: null,
      blob: null,
      compressedUrl: null,
      compare: null,
      rafId: null,
    };

    const { sidebar, main: previewArea } = shell.showWorkspace(`
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
    `);

    const origSizeEl = sidebar.querySelector("#orig-size");
    const compSizeEl = sidebar.querySelector("#comp-size");
    const qualitySlider = sidebar.querySelector("#quality");
    const qualityVal = sidebar.querySelector("#quality-val");
    const downloadBtn = sidebar.querySelector("#btn-download");

    const goBack = () => shell.showUpload();
    sidebar.querySelector("#btn-back").addEventListener("click", goBack);
    sidebar.querySelector("#btn-back2").addEventListener("click", goBack);

    qualitySlider.addEventListener("input", () => {
      qualityVal.textContent = qualitySlider.value + "%";
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.rafId = requestAnimationFrame(() => doCompress());
    });

    downloadBtn.addEventListener("click", () => {
      if (!state.blob) return;
      addHistory("图片压缩", file.name, formatFileSize(file.size), formatFileSize(state.blob.size));
      const name = file.name.replace(/\.[^.]+$/, "");
      downloadFile(state.blob, `compressed_${name}.jpg`);
    });

    async function doCompress() {
      if (!state.img) return;
      const gen = ++generation;
      const quality = qualitySlider.value / 100;

      try {
        const blob = await compressImage(state.img, quality);
        if (gen !== generation) return;

        if (state.compressedUrl) urls.revoke(state.compressedUrl);
        state.blob = blob;
        state.compressedUrl = urls.create(blob);
        state.compare.updateCompressed(state.compressedUrl);
        compSizeEl.textContent = formatFileSize(blob.size);
        compSizeEl.className = "size-value" + (blob.size < file.size ? " smaller" : "");
        downloadBtn.disabled = false;
      } catch (error) {
        if (gen !== generation) return;
        compSizeEl.textContent = "压缩失败";
        compSizeEl.className = "size-value";
        downloadBtn.disabled = true;
      }
    }

    cleanup = () => {
      generation++;
      if (state.compare) state.compare.destroy();
      if (state.rafId) cancelAnimationFrame(state.rafId);
      urls.revokeAll();
    };

    (async () => {
      try {
        origSizeEl.textContent = formatFileSize(file.size);
        state.img = await loadImage(file);
        const originalUrl = urls.create(file);
        state.compare = createCompare(previewArea, originalUrl);
        await doCompress();
      } catch (error) {
        previewArea.innerHTML = `<p class="upload-error" style="display:block">图片加载失败：${error.message}</p>`;
      }
    })();
  }

  function showBatchMode(files) {
    doCleanup();

    const urls = createUrlStore();
    const controller = createBatchController();
    const results = files.map((file) => ({
      file,
      thumbUrl: urls.create(file),
      img: null,
      blob: null,
      row: null,
    }));

    const { sidebar, main } = shell.showWorkspace(`
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
            <span class="batch-status pending">待压缩</span>
          </li>
        `
          )
          .join("")}
      </ul>
    `;

    main.querySelectorAll(".batch-item").forEach((row, index) => {
      results[index].row = row;
    });

    const qualitySlider = sidebar.querySelector("#quality");
    const qualityVal = sidebar.querySelector("#quality-val");
    const compressBtn = sidebar.querySelector("#btn-compress");
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

    qualitySlider.addEventListener("input", () => {
      qualityVal.textContent = qualitySlider.value + "%";
    });

    compressBtn.addEventListener("click", async () => {
      compressBtn.disabled = true;
      progressWrap.classList.remove("hidden");
      progressText.classList.remove("hidden");

      const quality = qualitySlider.value / 100;
      await processBatch(results, {
        controller,
        onItemStart: (result, index) => {
          progressText.textContent = `正在压缩 ${index + 1} / ${results.length}...`;
          progressBar.style.width = `${((index + 1) / results.length) * 100}%`;
          setRowStatus(result, "processing", "处理中");
        },
        processItem: async (result) => {
          if (!result.img) result.img = await loadImage(result.file);
          result.blob = await compressImage(result.img, quality);
          return result.blob;
        },
        onItemDone: (result, blob) => {
          const sizeEl = result.row.querySelector(".result-size");
          sizeEl.innerHTML = ` → <span class="smaller">${formatFileSize(blob.size)}</span>`;
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
          addHistory("批量压缩", files.length + " 张图片", "-", "-");
        },
      });
    });

    downloadAllBtn.addEventListener("click", async () => {
      const zipFiles = results
        .filter((result) => result.blob)
        .map((result) => {
          const name = result.file.name.replace(/\.[^.]+$/, "");
          return { name: `compressed_${name}.jpg`, blob: result.blob };
        });
      await downloadZip(zipFiles);
    });

    cleanup = () => {
      controller.cancel();
      urls.revokeAll();
    };
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
