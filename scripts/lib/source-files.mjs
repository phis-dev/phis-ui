// Why this file exists: nine validators walked the source tree with their own `collectSourceFiles` or
// `listSourceFiles` (audit-module-graph, validate-block-geometry-readers,
// validate-block-geometry-vocabulary, validate-client-reference-imports, validate-control-boundaries,
// validate-module-dependency-direction, validate-overlay-open-action-keys,
// validate-preset-icon-vocabulary, validate-record-predicate, validate-render-client-boundaries, and
// validate-builder-page-catalog-contracts), sync and async, each with its own skipped directories,
// extensions and test/declaration handling. The differences are options; a call states which walk it
// wants, and every former copy is one call with the options that reproduce its file set.
//
// Options (all optional):
//   extensions           file-name endings that count, default [".ts", ".tsx"]
//   skipDirectories      directory names (any depth) that are not entered
//   skipDotEntries       skip every entry whose name starts with "." (files and directories)
//   includeTests         default true; false drops `*.test.ts` and `*.test.tsx` (other extensions stay)
//   excludePattern       a RegExp; names it matches are dropped (for test files in other extensions)
//   includeDeclarations  default false; false drops names ending in `.d.ts`
//   regularFilesOnly     default false; true keeps only Dirent.isFile() entries (no symlinks), false keeps
//                        everything that is not a directory
//   rootFiles            exact names that count in the walked directory itself whatever their extension
//   relativeTo           return paths relative to this directory instead of absolute ones
//   sort                 sort the result (plain string order)
//   order                "depth" (default; a directory's files and subtrees in entry order) or
//                        "recursive-readdir" (a directory's files first, then its subdirectories
//                        from a stack, the last one found first -- the order of
//                        `readdir(directory, { recursive: true })`)
// A directory that cannot be read throws: a validator that checks less than it says must fail instead.
import { readdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import { repositoryRoot } from "./repo-root.mjs";

/**
 * @typedef {object} SourceFileOptions
 * @property {string[]} [extensions]
 * @property {Iterable<string>} [skipDirectories]
 * @property {boolean} [skipDotEntries]
 * @property {boolean} [includeTests]
 * @property {RegExp | null} [excludePattern]
 * @property {boolean} [includeDeclarations]
 * @property {boolean} [regularFilesOnly]
 * @property {string[]} [rootFiles]
 * @property {string | null} [relativeTo]
 * @property {boolean} [sort]
 * @property {"depth" | "recursive-readdir"} [order]
 */

/** @param {string} directory @param {SourceFileOptions} [options] */
function createWalk(directory, options = {}) {
  const {
    extensions = [".ts", ".tsx"],
    skipDirectories = [],
    skipDotEntries = false,
    includeTests = true,
    excludePattern = null,
    includeDeclarations = false,
    regularFilesOnly = false,
    rootFiles = [],
    relativeTo = null,
    sort = false,
    order = "depth",
  } = options;
  const root = path.resolve(repositoryRoot, directory);
  const skipped = new Set(skipDirectories);
  const isSkipped = (entry) => (skipDotEntries && entry.name.startsWith(".")) || (entry.isDirectory() && skipped.has(entry.name));
  const accepts = (entry, directoryPath) => {
    if (regularFilesOnly ? !entry.isFile() : entry.isDirectory()) {
      return false;
    }
    const name = entry.name;
    if (directoryPath === root && rootFiles.includes(name)) {
      return true;
    }
    return extensions.some((extension) => name.endsWith(extension))
      && (includeDeclarations || !name.endsWith(".d.ts"))
      && (includeTests || !/\.test\.tsx?$/u.test(name))
      && !(excludePattern && excludePattern.test(name));
  };
  const finish = (files) => {
    const result = relativeTo === null ? files : files.map((file) => path.relative(relativeTo, file));
    return sort ? result.sort() : result;
  };
  return { root, isSkipped, accepts, finish, order };
}

/**
 * Source files below `directory` (absolute, or relative to the repository root), asynchronously.
 *
 * @param {string} directory
 * @param {SourceFileOptions} [options]
 * @returns {Promise<string[]>}
 */
export async function listSourceFiles(directory, options) {
  const { root, isSkipped, accepts, finish, order } = createWalk(directory, options);
  /** @type {string[]} */
  const files = [];
  if (order === "recursive-readdir") {
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop();
      for (const entry of await readdir(current, { withFileTypes: true })) {
        if (isSkipped(entry)) {
          continue;
        }
        if (entry.isDirectory()) {
          stack.push(path.join(current, entry.name));
        } else if (accepts(entry, current)) {
          files.push(path.join(current, entry.name));
        }
      }
    }
    return finish(files);
  }
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (isSkipped(entry)) {
        continue;
      }
      if (entry.isDirectory()) {
        await walk(path.join(current, entry.name));
      } else if (accepts(entry, current)) {
        files.push(path.join(current, entry.name));
      }
    }
  };
  await walk(root);
  return finish(files);
}

/**
 * `listSourceFiles`, synchronously.
 *
 * @param {string} directory
 * @param {SourceFileOptions} [options]
 * @returns {string[]}
 */
export function collectSourceFiles(directory, options) {
  const { root, isSkipped, accepts, finish, order } = createWalk(directory, options);
  /** @type {string[]} */
  const files = [];
  if (order === "recursive-readdir") {
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop();
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        if (isSkipped(entry)) {
          continue;
        }
        if (entry.isDirectory()) {
          stack.push(path.join(current, entry.name));
        } else if (accepts(entry, current)) {
          files.push(path.join(current, entry.name));
        }
      }
    }
    return finish(files);
  }
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (isSkipped(entry)) {
        continue;
      }
      if (entry.isDirectory()) {
        walk(path.join(current, entry.name));
      } else if (accepts(entry, current)) {
        files.push(path.join(current, entry.name));
      }
    }
  };
  walk(root);
  return finish(files);
}

/**
 * The listing three preset validators made with `readdir(directory, { recursive: true })`: every
 * regular `.ts`/`.tsx` file (declarations and tests included), as repository-relative paths, in the
 * order that call returns them.
 */
/** @type {SourceFileOptions} */
export const repositoryRelativeListing = {
  extensions: [".tsx", ".ts"],
  includeDeclarations: true,
  regularFilesOnly: true,
  relativeTo: repositoryRoot,
  order: "recursive-readdir",
};
