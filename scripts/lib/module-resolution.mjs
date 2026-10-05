// Why this file exists: validate-area-client-reach, validate-render-client-boundaries and
// validate-module-boundary-exports each carried their own `resolveModuleFile`, `resolveSpecifier` and
// `readStaticImports`. The copies differed in three places, which are options here rather than a
// silently chosen variant:
//   - `matchAnyReadableFile` (module-boundary-exports): the bare candidate counts when any readable
//     file stands there, not only a `.ts`/`.tsx` one. The other two accept the bare candidate only
//     with a TypeScript extension.
//   - `consumeTrailingWhitespace` (render-client-boundaries): the statement pattern ends in `\s*;?`,
//     which swallows the newline after an import written without a semicolon. The other two stop at
//     the closing quote.
//   - the shape of the result: render-client-boundaries wants the statement text and whether it is
//     type-only; the others want targets of value imports. `readStaticImports` always returns the
//     records and the latter filter on `typeOnly`.
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { repositoryRoot } from "./repo-root.mjs";

const defaultExtensions = [".ts", ".tsx"];

function isReadableFile(candidate) {
  if (!existsSync(candidate)) {
    return false;
  }
  try {
    return readFileSync(candidate) != null;
  } catch {
    // A directory read throws; that is a miss and not a fault.
    return false;
  }
}

/**
 * The source file an extensionless or directory path stands for, or null.
 *
 * Order: the path itself, the path plus each extension, the directory's `index` plus each extension.
 */
export function resolveModuleFile(candidate, { extensions = defaultExtensions, matchAnyReadableFile = false } = {}) {
  if (matchAnyReadableFile) {
    for (const option of [
      candidate,
      ...extensions.map((extension) => `${candidate}${extension}`),
      ...extensions.map((extension) => path.join(candidate, `index${extension}`)),
    ]) {
      if (isReadableFile(option)) {
        return option;
      }
    }
    return null;
  }
  if (existsSync(candidate) && statSync(candidate).isFile() && /\.tsx?$/.test(candidate)) {
    return candidate;
  }
  for (const extension of extensions) {
    if (existsSync(candidate + extension)) {
      return candidate + extension;
    }
  }
  for (const extension of extensions) {
    const indexPath = path.join(candidate, `index${extension}`);
    if (existsSync(indexPath)) {
      return indexPath;
    }
  }
  return null;
}

/** The file a relative or `@phis/ui` specifier names, or null for anything else (packages, node: ids). */
export function resolveSpecifier(specifier, importingFile, options) {
  if (specifier.startsWith(".")) {
    return resolveModuleFile(path.resolve(path.dirname(importingFile), specifier), options);
  }
  if (specifier === "@phis/ui") {
    return resolveModuleFile(path.join(repositoryRoot, "index"), options);
  }
  if (specifier.startsWith("@phis/ui/")) {
    return resolveModuleFile(path.join(repositoryRoot, specifier.slice("@phis/ui/".length)), options);
  }
  return null;
}

const statementPattern =
  /(?:^|\n)\s*((?:import|export)\b[^;'"]*?\bfrom\s*(['"])([^'"]+)\2|import\s*(['"])([^'"]+)\4)/g;
const statementPatternConsumingTrailingWhitespace =
  /(?:^|\n)\s*((?:import|export)\b[^;'"]*?\bfrom\s*(['"])([^'"]+)\2|import\s*(['"])([^'"]+)\4)\s*;?/g;

/**
 * Every static import or re-export in `source` that resolves to a file, as
 * `{ target, statement, typeOnly }`.
 *
 * "import type" is erased; "import { type X }" is not, under verbatimModuleSyntax, so only the
 * former is `typeOnly`. Pass comment-stripped source when comments must not count.
 */
export function readStaticImports(source, importingFile, { consumeTrailingWhitespace = false, ...resolveOptions } = {}) {
  const imports = [];
  const pattern = consumeTrailingWhitespace ? statementPatternConsumingTrailingWhitespace : statementPattern;
  for (const match of source.matchAll(pattern)) {
    const statement = match[1].replace(/\s+/g, " ").trim();
    const target = resolveSpecifier(match[3] ?? match[5], importingFile, resolveOptions);
    if (!target) {
      continue;
    }
    imports.push({ target, statement, typeOnly: /^(?:import|export)\s+type\b/.test(statement) });
  }
  return imports;
}

/** The files that value imports (not `import type`) in `source` lead to. */
export function readValueImportTargets(source, importingFile, options) {
  return readStaticImports(source, importingFile, options)
    .filter((edge) => !edge.typeOnly)
    .map((edge) => edge.target);
}
