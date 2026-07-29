import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const languageSource = join(
  root,
  "node_modules",
  "@tesseract.js-data",
  "eng",
  "4.0.0",
  "eng.traineddata.gz",
);
const languageDirectory = join(root, "public", "tessdata");
const runtimeDirectory = join(root, "public", "tesseract");
const coreDirectory = join(runtimeDirectory, "core");

await Promise.all([
  mkdir(languageDirectory, { recursive: true }),
  mkdir(coreDirectory, { recursive: true }),
]);

await Promise.all([
  copyFile(languageSource, join(languageDirectory, "eng.traineddata.gz")),
  copyFile(
    join(root, "node_modules", "tesseract.js", "dist", "worker.min.js"),
    join(runtimeDirectory, "worker.min.js"),
  ),
  ...[
    "tesseract-core-lstm.wasm.js",
    "tesseract-core-simd-lstm.wasm.js",
    "tesseract-core-relaxedsimd-lstm.wasm.js",
  ].map((filename) =>
    copyFile(
      join(root, "node_modules", "tesseract.js-core", filename),
      join(coreDirectory, filename),
    ),
  ),
]);
