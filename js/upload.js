const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

function createUpload(container, options = {}) {
  const { onFiles, maxFiles = MAX_FILES } = options;

  container.innerHTML = `
    <div class="upload-zone">
      <div class="upload-icon">📁</div>
      <p class="upload-text">拖拽图片到这里，或 <span class="upload-link">点击上传</span></p>
      <p class="upload-hint">支持 JPG / PNG / WebP，单张最大 10MB，最多 ${maxFiles} 张</p>
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>
      <div class="upload-error"></div>
    </div>
  `;

  const zone = container.querySelector(".upload-zone");
  const input = container.querySelector("input");
  const errorEl = container.querySelector(".upload-error");

  zone.addEventListener("click", () => input.click());

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    handleFiles([...e.dataTransfer.files]);
  });

  input.addEventListener("change", () => {
    handleFiles([...input.files]);
    input.value = "";
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = "block";
    setTimeout(() => {
      errorEl.style.display = "none";
    }, 3000);
  }

  function handleFiles(files) {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      showError("请上传图片文件（JPG / PNG / WebP）");
      return;
    }

    const valid = [];
    for (const f of imageFiles) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        showError(`${f.name} 格式不支持`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        showError(`${f.name} 超过 10MB 限制`);
        continue;
      }
      valid.push(f);
    }

    if (valid.length > maxFiles) {
      showError(`最多上传 ${maxFiles} 张图片，已取前 ${maxFiles} 张`);
      valid.length = maxFiles;
    }

    if (valid.length > 0 && onFiles) {
      onFiles(valid);
    }
  }
}
