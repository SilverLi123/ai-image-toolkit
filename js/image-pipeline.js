const IMAGE_FORMATS = {
  jpg: { id: "jpg", label: "JPG", mime: "image/jpeg", extension: "jpg" },
  png: { id: "png", label: "PNG", mime: "image/png", extension: "png" },
  webp: { id: "webp", label: "WebP", mime: "image/webp", extension: "webp" },
};

function encodeImage(img, options = {}) {
  const { type = "image/jpeg", quality } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (type === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image encoding failed"));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

function compressImage(img, quality) {
  return encodeImage(img, {
    type: IMAGE_FORMATS.jpg.mime,
    quality,
  });
}

function convertImage(img, formatId, quality) {
  const format = IMAGE_FORMATS[formatId];
  if (!format) {
    return Promise.reject(new Error(`Unsupported image format: ${formatId}`));
  }

  return encodeImage(img, {
    type: format.mime,
    quality: formatId === "jpg" ? quality : undefined,
  });
}

function supportsMimeType(mime) {
  const canvas = document.createElement("canvas");
  return canvas.toDataURL(mime).startsWith(`data:${mime}`);
}
