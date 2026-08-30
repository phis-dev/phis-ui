import {
  access,
  readFile,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(packageRoot, "dist");
const sourceManifest = JSON.parse(
  await readFile(path.join(packageRoot, "package.json"), "utf8"),
);
const distManifest = JSON.parse(
  await readFile(path.join(distDirectory, "package.json"), "utf8"),
);

if (distManifest.name !== sourceManifest.name || distManifest.version !== sourceManifest.version) {
  throw new Error("Built package identity does not match the workspace package.");
}

const sourceExportKeys = Object.keys(sourceManifest.exports).sort();
const distExportKeys = Object.keys(distManifest.exports).sort();
if (JSON.stringify(sourceExportKeys) !== JSON.stringify(distExportKeys)) {
  throw new Error("Built package exports do not match the workspace export keys.");
}

if (
  !Array.isArray(distManifest.files) ||
  distManifest.files.length !== 1 ||
  distManifest.files[0] !== "**/*"
) {
  throw new Error("Built package must include the complete generated dist tree.");
}

if (distManifest.dependencies?.["server-only"] == null) {
  throw new Error('Built package must declare "server-only" as a runtime dependency.');
}

if (
  !Array.isArray(distManifest.sideEffects) ||
  !distManifest.sideEffects.includes("**/*.css")
) {
  throw new Error("Built package must preserve CSS side effects.");
}

let validatedExportTargets = 0;
for (const [exportKey, target] of Object.entries(distManifest.exports)) {
  if ("require" in target) {
    throw new Error(`ESM package export "${exportKey}" must not declare a require target.`);
  }

  for (const condition of ["types", "import", "default"]) {
    const relativeTarget = target[condition];
    if (
      typeof relativeTarget !== "string" ||
      !relativeTarget.startsWith("./") ||
      (condition === "types"
        ? !relativeTarget.endsWith(".d.ts")
        : !relativeTarget.endsWith(".js"))
    ) {
      throw new Error(
        `Invalid ${condition} target for package export "${exportKey}": ` +
          `${String(relativeTarget)}`,
      );
    }
    await access(path.resolve(distDirectory, relativeTarget));
    validatedExportTargets += 1;
  }
}

const emittedJavaScriptFiles = await collectFiles(distDirectory, ".js");
let validatedRelativeImports = 0;
for (const filePath of emittedJavaScriptFiles) {
  const source = await readFile(filePath, "utf8");
  const relativeImports = [
    ...source.matchAll(
      /(?:from\s*|import\s*\(\s*|import\s*)["'](\.[^"']+)["']/g,
    ),
  ].map((match) => match[1]);

  for (const specifier of relativeImports) {
    await assertRelativeImportExists(filePath, specifier);
    validatedRelativeImports += 1;
  }
}

console.log(
  `Package dist valid: ${sourceExportKeys.length} exports, ` +
    `${validatedExportTargets} export targets, ` +
    `${emittedJavaScriptFiles.length} ESM files, ` +
    `${validatedRelativeImports} relative imports.`,
);

async function collectFiles(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath, extension));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(entryPath);
    }
  }

  return files;
}

async function assertRelativeImportExists(importerPath, specifier) {
  const resolvedBase = path.resolve(path.dirname(importerPath), specifier);
  if (!resolvedBase.startsWith(`${distDirectory}${path.sep}`)) {
    throw new Error(
      `Relative import "${specifier}" escapes package dist from "${importerPath}".`,
    );
  }

  const hasRuntimeExtension = [".js", ".mjs", ".cjs", ".json", ".css"]
    .some((extension) => resolvedBase.endsWith(extension));
  const candidates = hasRuntimeExtension
    ? [resolvedBase]
    : [`${resolvedBase}.js`, path.join(resolvedBase, "index.js")];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return;
    } catch {
      // Try the next valid ESM resolution candidate.
    }
  }

  throw new Error(
    `Emitted relative import "${specifier}" from "${importerPath}" ` +
      "does not resolve inside package dist.",
  );
}
