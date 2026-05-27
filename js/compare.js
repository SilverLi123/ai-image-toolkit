function createCompare(container, originalSrc) {
  container.innerHTML = `
    <div class="compare">
      <div class="compare-labels">
        <span>原图</span>
        <span>压缩后</span>
      </div>
      <div class="compare-wrapper">
        <img class="compare-img" src="${originalSrc}" alt="原图">
        <div class="compare-overlay">
          <img class="compare-img" src="${originalSrc}" alt="压缩后">
        </div>
        <div class="compare-slider">
          <div class="compare-handle">⟺</div>
        </div>
      </div>
    </div>
  `;

  const wrapper = container.querySelector(".compare-wrapper");
  const overlay = container.querySelector(".compare-overlay");
  const slider = container.querySelector(".compare-slider");
  let isDragging = false;

  function updatePosition(clientX) {
    const rect = wrapper.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    const percent = (x / rect.width) * 100;
    overlay.style.clipPath = `inset(0 0 0 ${percent}%)`;
    slider.style.left = `${percent}%`;
  }

  wrapper.addEventListener("mousedown", (e) => {
    isDragging = true;
    updatePosition(e.clientX);
  });

  wrapper.addEventListener("touchstart", (e) => {
    isDragging = true;
    updatePosition(e.touches[0].clientX);
  });

  const onMouseMove = (e) => {
    if (isDragging) updatePosition(e.clientX);
  };
  const onTouchMove = (e) => {
    if (isDragging) updatePosition(e.touches[0].clientX);
  };
  const onStop = () => {
    isDragging = false;
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("touchmove", onTouchMove);
  document.addEventListener("mouseup", onStop);
  document.addEventListener("touchend", onStop);

  return {
    updateCompressed(src) {
      overlay.querySelector("img").src = src;
    },
    destroy() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("mouseup", onStop);
      document.removeEventListener("touchend", onStop);
    },
  };
}
