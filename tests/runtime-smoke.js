const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.resolve(__dirname, "..");

const sandbox = {
  console,
  Set,
  Promise,
  Error,
  URL: {
    created: [],
    revoked: [],
    createObjectURL(source) {
      const url = `blob:test-${this.created.length}`;
      this.created.push({ url, source });
      return url;
    },
    revokeObjectURL(url) {
      this.revoked.push(url);
    },
  },
  document: {
    createElement(tagName) {
      if (tagName !== "canvas") {
        throw new Error(`Unexpected element: ${tagName}`);
      }

      return {
        width: 0,
        height: 0,
        toDataURL(type) {
          return `data:${type};base64,`;
        },
        toBlob(callback, type) {
          callback({ type, size: 42 });
        },
        getContext() {
          return {
            fillStyle: "",
            fillRect() {},
            drawImage() {},
          };
        },
      };
    },
  },
};

sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function loadScript(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  vm.runInContext(source, sandbox, { filename: relativePath });
}

async function run() {
  loadScript("js/url-store.js");
  loadScript("js/image-pipeline.js");
  loadScript("js/batch-processor.js");
  loadScript("js/tool-shell.js");

  assert.strictEqual(typeof sandbox.createUrlStore, "function");
  const store = sandbox.createUrlStore();
  const url = store.create({ name: "example.png" });
  assert.strictEqual(url, "blob:test-0");
  store.revoke(url);
  assert.deepStrictEqual(sandbox.URL.revoked, ["blob:test-0"]);

  assert.strictEqual(typeof sandbox.compressImage, "function");
  assert.strictEqual(typeof sandbox.convertImage, "function");
  assert.strictEqual(sandbox.supportsMimeType("image/webp"), true);

  const img = { naturalWidth: 320, naturalHeight: 240 };
  const compressed = await sandbox.compressImage(img, 0.8);
  assert.strictEqual(compressed.type, "image/jpeg");
  const converted = await sandbox.convertImage(img, "png");
  assert.strictEqual(converted.type, "image/png");

  assert.strictEqual(typeof sandbox.createBatchController, "function");
  assert.strictEqual(typeof sandbox.processBatch, "function");
  assert.strictEqual(typeof sandbox.createToolShell, "function");

  const events = [];
  const result = await sandbox.processBatch([1, 2, 3], {
    processItem: async (item) => item * 2,
    onItemStart: (item) => events.push(`start:${item}`),
    onItemDone: (item, value) => events.push(`done:${value}`),
  });

  assert.deepStrictEqual(events, [
    "start:1",
    "done:2",
    "start:2",
    "done:4",
    "start:3",
    "done:6",
  ]);
  assert.strictEqual(result.total, 3);
  assert.strictEqual(result.succeeded, 3);
  assert.strictEqual(result.failed, 0);
  assert.strictEqual(result.cancelled, false);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
