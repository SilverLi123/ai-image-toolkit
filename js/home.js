const home = (() => {
  const tools = [
    {
      id: "compress",
      icon: "🖼️",
      name: "图片压缩",
      desc: "压缩图片大小，保持画质",
      gradient: "linear-gradient(135deg, #667eea, #764ba2)",
    },
    {
      id: "convert",
      icon: "🔄",
      name: "格式转换",
      desc: "JPG / PNG / WebP 互转",
      gradient: "linear-gradient(135deg, #f093fb, #f5576c)",
    },
    {
      id: "watermark",
      icon: "💧",
      name: "批量水印",
      desc: "自定义文字水印，批量添加",
      gradient: "linear-gradient(135deg, #4facfe, #00f2fe)",
    },
    {
      id: "removebg",
      icon: "✂️",
      name: "AI 去背景",
      desc: "一键去除图片背景",
      gradient: "linear-gradient(135deg, #43e97b, #38f9d7)",
    },
    {
      id: "crop",
      icon: "✂️",
      name: "图片裁剪",
      desc: "自由裁剪图片区域",
      gradient: "linear-gradient(135deg, #fa709a, #fee140)",
    },
    {
      id: "enhance",
      icon: "🔮",
      name: "AI 图片增强",
      desc: "超分辨率放大，提升清晰度",
      gradient: "linear-gradient(135deg, #a18cd1, #fbc2eb)",
    },
  ];

  function render(container) {
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
      <div class="history-section" id="history-section" style="display:none">
        <h2 style="font-size:20px;margin-top:40px;margin-bottom:16px">最近处理</h2>
        <div id="history-list"></div>
      </div>
    </div>
  `;

    const history = getHistory();
    if (history.length > 0) {
      const section = container.querySelector('#history-section');
      section.style.display = 'block';
      const list = container.querySelector('#history-list');
      list.innerHTML = history.map(h => `
        <div class="history-item">
          <span class="history-tool">${h.toolName}</span>
          <span class="history-file">${h.fileName}</span>
          <span class="history-sizes">${h.originalSize} → ${h.resultSize}</span>
          <span class="history-time">${timeAgo(h.timestamp)}</span>
        </div>
      `).join('');
    }
  }

  function destroy() {}

  return { render, destroy };
})();
