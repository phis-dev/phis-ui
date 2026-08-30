import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(packageRoot, "dist");

if (path.dirname(distDirectory) !== packageRoot || path.basename(distDirectory) !== "dist") {
  throw new Error(`Refusing to clean unexpected package directory: ${distDirectory}`);
}

await rm(distDirectory, { recursive: true, force: true });
