const tools = [
  {
    id: "compress",
    icon: "🖼️",
    name: "图片压缩",
    desc: "压缩图片大小，保持画质",
    gradient: "linear-gradient(135deg, #667eea, #764ba2)",
  },
];

export function render(container) {
  container.innerHTML = `
    <div class="home">
      <h1 class="home-title">AI 图片工具箱</h1>
      <p class="home-subtitle">选择一个工具开始处理你的图片</p>
      <div class="home-grid">
        ${tools
          .map(
            (tool) => `
          <a href="#/${tool.id}" class="tool-card" style="background: ${tool.gradient}">
            <div class="tool-icon">${tool.icon}</div>
            <div class="tool-name">${tool.name}</div>
            <div class="tool-desc">${tool.desc}</div>
          </a>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

export function destroy() {}
