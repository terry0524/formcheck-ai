// Prepare ignored third-party assets without committing model/WASM binaries.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const audit = await readFile(join(root, "lib/productionAssets.test.ts"), "utf8");
const assets = [...audit.matchAll(/"((?:models|mediapipe)\/[^\"]+)": "([a-f0-9]{64})"/g)];
if (assets.length !== 7) throw new Error("Expected the seven existing audited pose assets.");
const modelUrl = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

for (const [, relativePath, expectedHash] of assets) {
  const output = join(root, "public", relativePath);
  let existing;
  try { existing = await readFile(output); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing) {
    if (createHash("sha256").update(existing).digest("hex") !== expectedHash) {
      throw new Error(`Existing asset has a different hash; preserve and inspect it: ${relativePath}`);
    }
    console.log(`Verified existing ${relativePath}`);
    continue;
  }
  let bytes;
  if (relativePath.startsWith("models/")) {
    const response = await fetch(modelUrl, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Official model download failed: ${response.status}`);
    bytes = new Uint8Array(await response.arrayBuffer());
  } else {
    bytes = await readFile(join(root, "node_modules/@mediapipe/tasks-vision/wasm", basename(relativePath)));
  }
  if (createHash("sha256").update(bytes).digest("hex") !== expectedHash) {
    throw new Error(`Publisher/runtime asset differs from the existing audited version: ${relativePath}`);
  }
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, bytes, { flag: "wx" });
  console.log(`Prepared verified ${relativePath}`);
}
