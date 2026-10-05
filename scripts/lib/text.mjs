// Why this file exists: `readSource` was written again in eleven validators (sync and async, with
// absolute or repo-relative paths, with and without a cache) and `lineOf` in three. Both are the same
// few lines everywhere; the variants that differ only in what they do with the text (the comment
// stripping that import scanners need) are kept as separate helpers here instead of copies.
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { repositoryRoot } from "./repo-root.mjs";

/** The UTF-8 text of a file, given absolute or relative to the repository root. */
export function readSource(file) {
  return readFile(path.resolve(repositoryRoot, file), "utf8");
}

/** `readSource`, synchronously. */
export function readSourceSync(file) {
  return readFileSync(path.resolve(repositoryRoot, file), "utf8");
}

/**
 * Source text without block comments and line comments.
 *
 * Comments quote imports as often as code makes them; neither kind may count as an edge. A `//` that
 * follows a quote or a colon (a URL, a string) is left alone.
 */
export function stripComments(raw) {
  return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/** The 1-based line number of the character at `index`. */
export function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}
