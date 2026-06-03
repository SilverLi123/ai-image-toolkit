const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

async function verifyScriptIntegrity() {
  const scriptPattern =
    /<script\b[^>]*\bsrc="([^"]+)"[^>]*\bintegrity="sha512-([^"]+)"[^>]*>/g;
  const scripts = [...html.matchAll(scriptPattern)];

  assert.ok(scripts.length > 0, "expected at least one script with SRI");

  for (const [, src, expectedHash] of scripts) {
    if (!/^https?:\/\//.test(src)) continue;

    const response = await fetch(src);
    assert.ok(response.ok, `failed to fetch ${src}: ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const actualHash = crypto.createHash("sha512").update(buffer).digest("base64");

    assert.strictEqual(
      actualHash,
      expectedHash,
      `integrity hash mismatch for ${src}`
    );
  }
}

async function run() {
  assert.match(
    html,
    /<link\s+rel="icon"\s+href="data:,"\s*\/?>/,
    "expected an explicit favicon data URL to avoid /favicon.ico 404s"
  );

  await verifyScriptIntegrity();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
