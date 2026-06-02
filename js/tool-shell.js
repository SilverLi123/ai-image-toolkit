function createToolShell(container, options = {}) {
  const { uploadOptions = {}, onReset } = options;
  let destroyed = false;

  function showUpload() {
    if (onReset) onReset();
    container.innerHTML = `<div class="upload-container"></div>`;
    const uploadArea = container.querySelector(".upload-container");
    createUpload(uploadArea, uploadOptions);
  }

  function showWorkspace(sidebarHtml, mainHtml = "") {
    container.innerHTML = `
      <div class="compress-layout">
        <div class="compress-sidebar">${sidebarHtml}</div>
        <div class="compress-main" id="preview-area">${mainHtml}</div>
      </div>
    `;

    return {
      sidebar: container.querySelector(".compress-sidebar"),
      main: container.querySelector(".compress-main"),
    };
  }

  function destroy() {
    destroyed = true;
    if (onReset) onReset();
    container.innerHTML = "";
  }

  return {
    get destroyed() {
      return destroyed;
    },
    showUpload,
    showWorkspace,
    destroy,
  };
}
