import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import { repositoryRoot } from "./lib/repo-root.mjs";
import { collectSourceFiles } from "./lib/source-files.mjs";
import { forEachDescendant } from "./lib/ts-ast";

/*
 * `React.cache` compares its arguments by identity. A function that takes an options object -- its
 * parameter a destructuring pattern -- is called with a fresh object every time, so wrapping it in
 * `cache(...)` keeps nothing: fourteen Gateway reads did that while CACHES.md said they were memoized
 * (AUDIT-2026-10-13, PU10). Such a read goes through `definePhiRequestMemo`
 * (server-helpers/request-memo.ts), which keys by the options' values. Positional parameters stay with
 * `cache(...)`: a string compares by value, and an object passed positionally is the caller's instance.
 */

const offenders: string[] = [];
for (const file of collectSourceFiles(repositoryRoot, {
  extensions: [".ts", ".tsx"],
  skipDirectories: ["node_modules", ".git", ".next", "dist", "scripts"],
  includeTests: false,
})) {
  const source = readFileSync(file, "utf8");
  if (!/\bcache\(/u.test(source)) continue;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  forEachDescendant(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== "cache") return;
    const wrapped = node.arguments[0];
    if (!wrapped || !(ts.isArrowFunction(wrapped) || ts.isFunctionExpression(wrapped))) return;
    if (!wrapped.parameters.some((parameter) => ts.isObjectBindingPattern(parameter.name))) return;
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    offenders.push(`${path.relative(repositoryRoot, file)}:${line + 1}`);
  });
}

assert.deepEqual(
  offenders,
  [],
  "`cache(...)` around a function that takes an options object never returns a kept result; use "
    + `definePhiRequestMemo (server-helpers/request-memo.ts):\n${offenders.join("\n")}`,
);
console.log("Request memos valid.");
