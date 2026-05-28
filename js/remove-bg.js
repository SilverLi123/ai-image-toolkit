const removeBg = (() => {
  const API_URL = "https://api.remove.bg/v1.0/removebg";

  let cleanup = null;

  function render(container) {
    showUpload(container);
  }

  function showUpload(container) {
    doCleanup();
    container.innerHTML = `
      <div class="upload-container"></div>
    `;
    const uploadArea = container.querySelector(".upload-container");
    createUpload(uploadArea, {
      maxFiles: 1,
      onFiles: (files) => {
        showWorkspace(container, files[0]);
      },
    });
  }

  function showWorkspace(container, file) {
    const state = {
      originalUrl: URL.createObjectURL(file),
      resultBlob: null,
      resultUrl: null,
    };

    container.innerHTML = `
    <div class="compress-layout">
      <div class="compress-sidebar">
        <button class="btn-back" id="btn-back">← 重新上传</button>
        <h2>AI 去背景</h2>
        <div class="size-info">
          <div class="size-item">
            <div class="size-label">原始文件</div>
            <div class="size-value">${formatFileSize(file.size)}</div>
          </div>
          <div class="size-item">
            <div class="size-label">去背景后</div>
            <div class="size-value" id="result-size">-</div>
          </div>
        </div>
        <div class="setting-group">
          <label>API Key</label>
          <input class="wm-input" type="password" id="api-key" placeholder="输入 remove.bg API Key">
          <p style="font-size:12px;color:var(--text-secondary);margin-top:6px">
            <a href="https://www.remove.bg/api" target="_blank" style="color:var(--brand-start)">获取免费 API Key</a>
            （每月 50 次免费）
          </p>
        </div>
        <button class="btn btn-primary" id="btn-remove">✨ 去除背景</button>
        <div class="progress-bar-container hidden" id="progress-wrap">
          <div class="progress-bar" id="progress-bar" style="width:100%;animation:pulse 1.5s infinite"></div>
        </div>
        <p class="hidden" id="status-text" style="font-size:13px;color:var(--text-secondary);margin-bottom:8px"></p>
        <button class="btn btn-primary hidden" id="btn-download">⬇ 下载透明 PNG</button>
        <button class="btn btn-secondary" id="btn-back2">← 重新上传</button>
      </div>
      <div class="compress-main" id="preview-area">
        <div class="compare">
          <div class="compare-labels">
            <span>原图</span>
            <span></span>
          </div>
          <div class="compare-wrapper" style="cursor:default">
            <img class="compare-img" src="${state.originalUrl}" alt="原图">
          </div>
        </div>
      </div>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    </style>
  `;

    const apiKeyInput = container.querySelector("#api-key");
    const removeBtn = container.querySelector("#btn-remove");
    const progressWrap = container.querySelector("#progress-wrap");
    const statusText = container.querySelector("#status-text");
    const downloadBtn = container.querySelector("#btn-download");
    const resultSizeEl = container.querySelector("#result-size");
    const previewArea = container.querySelector("#preview-area");

    const savedKey = localStorage.getItem("removebg_apikey") || "";
    if (savedKey) apiKeyInput.value = savedKey;

    const goBack = () => {
      doCleanup();
      showUpload(container);
    };
    container.querySelector("#btn-back").addEventListener("click", goBack);
    container.querySelector("#btn-back2").addEventListener("click", goBack);

    removeBtn.addEventListener("click", async () => {
      const apiKey = apiKeyInput.value.trim();
      if (!apiKey) {
        statusText.textContent = "请输入 API Key";
        statusText.classList.remove("hidden");
        statusText.style.color = "#dc2626";
        return;
      }

      localStorage.setItem("removebg_apikey", apiKey);
      removeBtn.disabled = true;
      progressWrap.classList.remove("hidden");
      statusText.classList.remove("hidden");
      statusText.style.color = "var(--text-secondary)";
      statusText.textContent = "正在调用 AI 处理，请稍候...";

      try {
        const formData = new FormData();
        formData.append("image_file", file);
        formData.append("size", "auto");

        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "X-Api-Key": apiKey },
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            err.errors?.[0]?.title || `API 错误 (${response.status})`
          );
        }

        state.resultBlob = await response.blob();
        state.resultUrl = URL.createObjectURL(state.resultBlob);

        resultSizeEl.textContent = formatFileSize(state.resultBlob.size);
        resultSizeEl.className = "size-value";

        previewArea.innerHTML = `
          <div class="compare">
            <div class="compare-labels">
              <span>原图</span>
              <span>去背景后</span>
            </div>
            <div class="rbg-compare">
              <div class="rbg-item">
                <img class="compare-img" src="${state.originalUrl}" alt="原图">
              </div>
              <div class="rbg-item" style="background:var(--checkerboard)">
                <img class="compare-img" src="${state.resultUrl}" alt="去背景">
              </div>
            </div>
          </div>
        `;

        statusText.textContent = "处理完成！";
        statusText.style.color = "#22c55e";
        downloadBtn.classList.remove("hidden");
      } catch (err) {
        statusText.textContent = "失败：" + err.message;
        statusText.style.color = "#dc2626";
        removeBtn.disabled = false;
      } finally {
        progressWrap.classList.add("hidden");
      }
    });

    downloadBtn.addEventListener("click", () => {
      if (state.resultBlob) {
        const name = file.name.replace(/\.[^.]+$/, "");
        downloadFile(state.resultBlob, `nobg_${name}.png`);
      }
    });

    cleanup = () => {
      if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
      if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
    };
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
