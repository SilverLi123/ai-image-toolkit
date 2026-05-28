const enhance = (() => {
  const API_URL = "https://api.deepai.org/api/torch-srgan";

  let cleanup = null;

  function render(container) {
    showUpload(container);
  }

  function showUpload(container) {
    doCleanup();
    container.innerHTML = `<div class="upload-container"></div>`;
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
        <h2>AI 图片增强</h2>
        <div class="size-info">
          <div class="size-item">
            <div class="size-label">原始文件</div>
            <div class="size-value">${formatFileSize(file.size)}</div>
          </div>
          <div class="size-item">
            <div class="size-label">增强后</div>
            <div class="size-value" id="result-size">-</div>
          </div>
        </div>
        <div class="setting-group">
          <label>API Key</label>
          <input class="wm-input" type="password" id="api-key" placeholder="输入 DeepAI API Key">
          <p style="font-size:12px;color:var(--text-secondary);margin-top:6px">
            <a href="https://deepai.org/docs" target="_blank" style="color:var(--brand-start)">获取 API Key</a>
            （DeepAI 超分辨率 API）
          </p>
        </div>
        <button class="btn btn-primary" id="btn-enhance">🔮 开始增强</button>
        <div class="progress-bar-container hidden" id="progress-wrap">
          <div class="progress-bar" id="progress-bar" style="width:100%;animation:pulse 1.5s infinite"></div>
        </div>
        <p class="hidden" id="status-text" style="font-size:13px;color:var(--text-secondary);margin-bottom:8px"></p>
        <button class="btn btn-primary hidden" id="btn-download">⬇ 下载增强图片</button>
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
    const enhanceBtn = container.querySelector("#btn-enhance");
    const progressWrap = container.querySelector("#progress-wrap");
    const statusText = container.querySelector("#status-text");
    const downloadBtn = container.querySelector("#btn-download");
    const resultSizeEl = container.querySelector("#result-size");
    const previewArea = container.querySelector("#preview-area");

    const savedKey = localStorage.getItem("deepai_apikey") || "";
    if (savedKey) apiKeyInput.value = savedKey;

    const goBack = () => {
      doCleanup();
      showUpload(container);
    };
    container.querySelector("#btn-back").addEventListener("click", goBack);
    container.querySelector("#btn-back2").addEventListener("click", goBack);

    enhanceBtn.addEventListener("click", async () => {
      const apiKey = apiKeyInput.value.trim();
      if (!apiKey) {
        statusText.textContent = "请输入 API Key";
        statusText.classList.remove("hidden");
        statusText.style.color = "#dc2626";
        return;
      }

      localStorage.setItem("deepai_apikey", apiKey);
      enhanceBtn.disabled = true;
      progressWrap.classList.remove("hidden");
      statusText.classList.remove("hidden");
      statusText.style.color = "var(--text-secondary)";
      statusText.textContent = "正在调用 AI 超分辨率处理，请稍候...";

      try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "api-key": apiKey },
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.err || `API 错误 (${response.status})`);
        }

        const data = await response.json();

        if (!data.output_url) {
          throw new Error("API 未返回增强图片 URL");
        }

        // Fetch the enhanced image from the output URL
        const imgResponse = await fetch(data.output_url);
        if (!imgResponse.ok) {
          throw new Error("无法下载增强图片");
        }

        state.resultBlob = await imgResponse.blob();
        state.resultUrl = URL.createObjectURL(state.resultBlob);

        resultSizeEl.textContent = formatFileSize(state.resultBlob.size);
        resultSizeEl.className = "size-value";

        previewArea.innerHTML = `
          <div class="compare">
            <div class="compare-labels">
              <span>原图</span>
              <span>增强后</span>
            </div>
            <div class="rbg-compare">
              <div class="rbg-item">
                <img class="compare-img" src="${state.originalUrl}" alt="原图">
              </div>
              <div class="rbg-item">
                <img class="compare-img" src="${state.resultUrl}" alt="增强后">
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
        enhanceBtn.disabled = false;
      } finally {
        progressWrap.classList.add("hidden");
      }
    });

    downloadBtn.addEventListener("click", () => {
      if (state.resultBlob) {
        const name = file.name.replace(/\.[^.]+$/, "");
        downloadFile(state.resultBlob, `enhanced_${name}.png`);
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
