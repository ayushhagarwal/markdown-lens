import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(
  root,
  "node_modules",
  "@tesseract.js-data",
  "eng",
  "4.0.0",
  "eng.traineddata.gz",
);
const destinationDirectory = join(root, "public", "tessdata");

await mkdir(destinationDirectory, { recursive: true });
await copyFile(source, join(destinationDirectory, "eng.traineddata.gz"));
