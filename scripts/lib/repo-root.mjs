// Why this file exists: twelve validators took the repository root from `process.cwd()` and a handful
// more rebuilt it from `import.meta.url` or `import.meta.dirname`, each with its own number of `..`.
// A script run from another directory then scanned that directory and checked nothing. The root is
// derived once, from where this file lives, so every script finds the repository from anywhere.
import path from "node:path";

/** The absolute path of the repository root (the directory holding package.json), without trailing slash. */
export const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");

/** `path.join(repositoryRoot, ...segments)`. */
export function fromRepositoryRoot(...segments) {
  return path.join(repositoryRoot, ...segments);
}
