const crop = (() => {
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
      img: null,
      resultUrl: null,
      resultBlob: null,
      sel: null,       // { x, y, w, h } in display coords
      dragging: false,
      dragType: null,   // 'create' | 'move' | 'nw' | 'ne' | 'sw' | 'se'
      dragStart: null,
      selStart: null,
      displayImg: null,
    };

    container.innerHTML = `
    <div class="compress-layout">
      <div class="compress-sidebar">
        <button class="btn-back" id="btn-back">← 重新上传</button>
        <h2>图片裁剪</h2>
        <div class="size-info">
          <div class="size-item">
            <div class="size-label">原始尺寸</div>
            <div class="size-value" id="orig-size">-</div>
          </div>
          <div class="size-item">
            <div class="size-label">选区尺寸</div>
            <div class="size-value" id="sel-size">-</div>
          </div>
        </div>
        <p id="sel-dims" style="font-size:13px;color:var(--text-secondary);margin-bottom:12px"></p>
        <button class="btn btn-primary" id="btn-crop" disabled>✂️ 裁剪</button>
        <button class="btn btn-primary hidden" id="btn-download">⬇ 下载裁剪结果</button>
        <button class="btn btn-secondary" id="btn-back2">← 重新上传</button>
      </div>
      <div class="compress-main" id="preview-area"></div>
    </div>
    `;

    const origSizeEl = container.querySelector("#orig-size");
    const selSizeEl = container.querySelector("#sel-size");
    const selDimsEl = container.querySelector("#sel-dims");
    const cropBtn = container.querySelector("#btn-crop");
    const downloadBtn = container.querySelector("#btn-download");
    const previewArea = container.querySelector("#preview-area");

    const goBack = () => {
      doCleanup();
      showUpload(container);
    };
    container.querySelector("#btn-back").addEventListener("click", goBack);
    container.querySelector("#btn-back2").addEventListener("click", goBack);

    function getDisplayScale() {
      const displayImg = state.displayImg;
      if (!state.img || !displayImg || !displayImg.clientWidth || !displayImg.clientHeight) {
        return null;
      }
      return {
        scaleX: state.img.naturalWidth / displayImg.clientWidth,
        scaleY: state.img.naturalHeight / displayImg.clientHeight,
      };
    }

    function updateSelInfo() {
      if (!state.sel) {
        selSizeEl.textContent = "-";
        selDimsEl.textContent = "";
        cropBtn.disabled = true;
        return;
      }
      const s = state.sel;
      if (s.w < 1 || s.h < 1) {
        selSizeEl.textContent = "-";
        selDimsEl.textContent = "";
        cropBtn.disabled = true;
        return;
      }
      // Convert display coords to real image coords
      const scale = getDisplayScale();
      if (!scale) return;
      const { scaleX, scaleY } = scale;
      const realW = Math.round(s.w * scaleX);
      const realH = Math.round(s.h * scaleY);
      selSizeEl.textContent = realW + " x " + realH;
      selDimsEl.textContent = `位置: (${Math.round(s.x * scaleX)}, ${Math.round(s.y * scaleY)})`;
      cropBtn.disabled = false;
    }

    function renderCropOverlay() {
      // Remove old overlay if any
      const old = previewArea.querySelector(".crop-container");
      if (old) old.remove();

      const wrap = document.createElement("div");
      wrap.className = "crop-container";

      const img = document.createElement("img");
      img.src = state.originalUrl;
      img.alt = "裁剪原图";
      img.draggable = false;
      state.displayImg = img;
      wrap.appendChild(img);

      // Selection div
      const selDiv = document.createElement("div");
      selDiv.className = "crop-selection hidden";
      wrap.appendChild(selDiv);

      // Info label under selection
      const infoDiv = document.createElement("div");
      infoDiv.className = "crop-info hidden";
      wrap.appendChild(infoDiv);

      previewArea.appendChild(wrap);

      function updateSelectionDOM() {
        if (!state.sel || state.sel.w < 1 || state.sel.h < 1) {
          selDiv.classList.add("hidden");
          infoDiv.classList.add("hidden");
          return;
        }
        const s = state.sel;
        selDiv.classList.remove("hidden");
        selDiv.style.left = s.x + "px";
        selDiv.style.top = s.y + "px";
        selDiv.style.width = s.w + "px";
        selDiv.style.height = s.h + "px";

        const scale = getDisplayScale();
        if (!scale) return;
        const { scaleX, scaleY } = scale;
        const realW = Math.round(s.w * scaleX);
        const realH = Math.round(s.h * scaleY);
        infoDiv.classList.remove("hidden");
        infoDiv.style.left = s.x + "px";
        infoDiv.style.top = (s.y + s.h) + "px";
        infoDiv.textContent = realW + " x " + realH;
      }

      function getPos(e) {
        const rect = img.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: Math.max(0, Math.min(clientX - rect.left, rect.width)),
          y: Math.max(0, Math.min(clientY - rect.top, rect.height)),
        };
      }

      function hitTest(pos) {
        if (!state.sel) return "create";
        const s = state.sel;
        const px = pos.x;
        const py = pos.y;
        const handleSize = 10;

        // Check corners first
        if (Math.abs(px - s.x) < handleSize && Math.abs(py - s.y) < handleSize) return "nw";
        if (Math.abs(px - (s.x + s.w)) < handleSize && Math.abs(py - s.y) < handleSize) return "ne";
        if (Math.abs(px - s.x) < handleSize && Math.abs(py - (s.y + s.h)) < handleSize) return "sw";
        if (Math.abs(px - (s.x + s.w)) < handleSize && Math.abs(py - (s.y + s.h)) < handleSize) return "se";

        // Check if inside selection
        if (px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) return "move";

        return "create";
      }

      function onPointerDown(e) {
        e.preventDefault();
        const pos = getPos(e);
        const type = hitTest(pos);
        state.dragging = true;
        state.dragType = type;
        state.dragStart = pos;

        if (type === "create") {
          state.sel = { x: pos.x, y: pos.y, w: 0, h: 0 };
        } else {
          state.selStart = { ...state.sel };
        }
      }

      function onPointerMove(e) {
        if (!state.dragging) {
          // Update cursor
          const pos = getPos(e);
          const type = hitTest(pos);
          if (type === "nw" || type === "se") wrap.style.cursor = "nwse-resize";
          else if (type === "ne" || type === "sw") wrap.style.cursor = "nesw-resize";
          else if (type === "move") wrap.style.cursor = "move";
          else wrap.style.cursor = "crosshair";
          return;
        }
        e.preventDefault();
        const pos = getPos(e);
        const maxX = img.clientWidth;
        const maxY = img.clientHeight;
        const type = state.dragType;

        if (type === "create") {
          let x = Math.min(state.dragStart.x, pos.x);
          let y = Math.min(state.dragStart.y, pos.y);
          let w = Math.abs(pos.x - state.dragStart.x);
          let h = Math.abs(pos.y - state.dragStart.y);
          // Clamp
          if (x + w > maxX) w = maxX - x;
          if (y + h > maxY) h = maxY - y;
          state.sel = { x, y, w, h };
        } else if (type === "move") {
          const dx = pos.x - state.dragStart.x;
          const dy = pos.y - state.dragStart.y;
          let x = state.selStart.x + dx;
          let y = state.selStart.y + dy;
          const s = state.selStart;
          if (x < 0) x = 0;
          if (y < 0) y = 0;
          if (x + s.w > maxX) x = maxX - s.w;
          if (y + s.h > maxY) y = maxY - s.h;
          state.sel = { x, y, w: s.w, h: s.h };
        } else {
          // Corner resize
          const s = state.selStart;
          let x = s.x, y = s.y, w = s.w, h = s.h;
          const dx = pos.x - state.dragStart.x;
          const dy = pos.y - state.dragStart.y;

          if (type === "se") {
            w = Math.max(1, s.w + dx);
            h = Math.max(1, s.h + dy);
          } else if (type === "nw") {
            x = s.x + dx;
            y = s.y + dy;
            w = Math.max(1, s.w - dx);
            h = Math.max(1, s.h - dy);
          } else if (type === "ne") {
            y = s.y + dy;
            w = Math.max(1, s.w + dx);
            h = Math.max(1, s.h - dy);
          } else if (type === "sw") {
            x = s.x + dx;
            w = Math.max(1, s.w - dx);
            h = Math.max(1, s.h + dy);
          }

          // Clamp
          if (x < 0) { w += x; x = 0; }
          if (y < 0) { h += y; y = 0; }
          if (x + w > maxX) w = maxX - x;
          if (y + h > maxY) h = maxY - y;

          state.sel = { x, y, w: Math.max(1, w), h: Math.max(1, h) };
        }

        updateSelectionDOM();
        updateSelInfo();
      }

      function onPointerUp() {
        state.dragging = false;
        state.dragType = null;
        if (state.sel && (state.sel.w < 2 || state.sel.h < 2)) {
          state.sel = null;
          updateSelectionDOM();
          updateSelInfo();
        }
      }

      wrap.addEventListener("mousedown", onPointerDown);
      wrap.addEventListener("mousemove", onPointerMove);
      document.addEventListener("mouseup", onPointerUp);
      wrap.addEventListener("touchstart", onPointerDown, { passive: false });
      document.addEventListener("touchmove", onPointerMove, { passive: false });
      document.addEventListener("touchend", onPointerUp);

      // Store cleanup for events
      const origCleanup = cleanup;
      cleanup = () => {
        document.removeEventListener("mouseup", onPointerUp);
        document.removeEventListener("touchmove", onPointerMove);
        document.removeEventListener("touchend", onPointerUp);
        if (origCleanup) origCleanup();
      };
    }

    cropBtn.addEventListener("click", () => {
      if (!state.sel || !state.img) return;
      const s = state.sel;
      const scale = getDisplayScale();
      if (!scale) return;
      const { scaleX, scaleY } = scale;

      const sx = Math.round(s.x * scaleX);
      const sy = Math.round(s.y * scaleY);
      const sw = Math.round(s.w * scaleX);
      const sh = Math.round(s.h * scaleY);

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(state.img, sx, sy, sw, sh, 0, 0, sw, sh);

      canvas.toBlob((blob) => {
        if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
        state.resultBlob = blob;
        state.resultUrl = URL.createObjectURL(blob);

        const name = file.name.replace(/\.[^.]+$/, "");
        downloadBtn.onclick = () => {
          downloadFile(blob, `cropped_${name}.png`);
        };
        downloadBtn.classList.remove("hidden");

        // Show result in preview area
        previewArea.innerHTML = `
          <div class="compare">
            <div class="compare-labels">
              <span>原图</span>
              <span>裁剪结果</span>
            </div>
            <div class="rbg-compare">
              <div class="rbg-item">
                <img class="compare-img" src="${state.originalUrl}" alt="原图">
              </div>
              <div class="rbg-item">
                <img class="compare-img" src="${state.resultUrl}" alt="裁剪结果">
              </div>
            </div>
          </div>
        `;
      }, "image/png");
    });

    // Cleanup
    const prevCleanup = cleanup;
    cleanup = () => {
      if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
      if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
      if (prevCleanup) prevCleanup();
    };

    // Load image and render overlay
    (async () => {
      state.img = await loadImage(file);
      origSizeEl.textContent = state.img.naturalWidth + " x " + state.img.naturalHeight;
      renderCropOverlay();
    })();
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
