import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("dist");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(absolute) : [absolute];
  }));
  return nested.flat();
}

const files = (await collectFiles(outputDirectory))
  .map((file) => `/${path.relative(outputDirectory, file).split(path.sep).join("/")}`)
  .filter((file) => file.startsWith("/assets/"))
  // Modern browsers use WOFF2. Vite still emits legacy fallbacks referenced
  // by the upstream stylesheet, but prefetching them would waste ~3.6 MB.
  .filter((file) => !/\.(?:woff|ttf)$/.test(file))
  .sort();

const buildId = createHash("sha256").update(files.join("\n")).digest("hex").slice(0, 12);
const serviceWorkerPath = path.join(outputDirectory, "sw.js");
let serviceWorker = await readFile(serviceWorkerPath, "utf8");
serviceWorker = serviceWorker
  .replace("__NOOR_BUILD__", buildId)
  .replace("/* __NOOR_PRECACHE__ */", files.map((file) => JSON.stringify(file)).join(", "));
await writeFile(serviceWorkerPath, serviceWorker);

console.log(`Injected ${files.length} application assets into Noor cache ${buildId}.`);
