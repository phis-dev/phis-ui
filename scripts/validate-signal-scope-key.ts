import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { forEachDescendant } from "./lib/ts-ast";

/**
 * `scope` is not `scopeKey` (SIGNALS.md, "Scopes").
 *
 * A `scopeKey` names a transient store, a Provider binding, a collection or a data-source namespace. A
 * signal's route is `scope`, `channel`, `sender` and `receiver`, and nothing about one is derived from
 * the other. The two look alike and both say "which one", so a `scopeKey` is the nearest value to hand
 * when a route has to be told apart -- and a route built from it would deliver by whatever a store
 * happened to be called, outside every route the Builder writes and `phis` checks.
 *
 * Refused:
 *
 * - the signal family itself -- the bus, `helpers/signal-*`, the signal types, the Control signal
 *   controller and the command buttons -- naming `scopeKey` at all: what routes a signal does not know
 *   the concept;
 * - anywhere else, a routing field (`scope`, `channel`, `sender`, `receiver`) written in an object
 *   literal from an expression that reads a `scopeKey`, directly or through a local that does;
 * - a signal address built (`createPhiSignal*Address`) from such an expression.
 *
 * Allowed, and the reason this is not a ban on the word: a `scopeKey` carried as data -- a binding
 * parameter in a signal's `value` (the Revisions Controller sends `{ params: { area, kind, scopeKey } }`),
 * a store key, a Provider's namespace. That is `value`, which is what `value` is for.
 */

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const resolve = (relativePath: string) => new URL(relativePath, new URL(packageRoot, "file:"));

const SIGNAL_FAMILY = (path: string) =>
  path === "components/runtime/runtime-signal-bus.tsx" ||
  path === "types/signals.ts" ||
  path === "components/widgets/client/shared/phi-control-signals.ts" ||
  path === "components/widgets/client/shared/phi-command-buttons.ts" ||
  /^helpers\/signal-[^/]+\.tsx?$/u.test(path);

const ROUTING_FIELDS = new Set(["scope", "channel", "sender", "receiver"]);
const ADDRESS_CONSTRUCTOR = /^createPhiSignal\w*Address$/u;

const sourcePaths = execFileSync("git", ["ls-files", "*.ts", "*.tsx"], { cwd: packageRoot, encoding: "utf8" })
  .split("\n")
  .filter((path) => path && !path.startsWith("scripts/") && !path.includes(".test."))
  // A file deleted on disk and not yet staged is still in the index; it has no contract left to check.
  .filter((path) => existsSync(resolve(path)));

for (const family of [
  "components/runtime/runtime-signal-bus.tsx",
  "types/signals.ts",
  "components/widgets/client/shared/phi-control-signals.ts",
  "components/widgets/client/shared/phi-command-buttons.ts",
]) {
  assert.ok(sourcePaths.includes(family), `${family} moved; point SIGNAL_FAMILY at its new place.`);
}

const isScopeKeyName = (node: ts.Node) =>
  (ts.isIdentifier(node) && node.text === "scopeKey") ||
  (ts.isStringLiteral(node) && node.text === "scopeKey");

function mentionsScopeKey(node: ts.Node) {
  let found = false;
  forEachDescendant(node, (child) => {
    if (!found && isScopeKeyName(child)) found = true;
  });
  return found;
}

/** Every place in one file where a signal route is derived from a `scopeKey`. */
function findProblems(path: string, text: string): string[] {
  const problems: string[] = [];
  if (!text.includes("scopeKey")) return problems;
  const sourceFile = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const where = (node: ts.Node) => `${path}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;

  if (SIGNAL_FAMILY(path)) {
    forEachDescendant(sourceFile, (node) => {
      if (isScopeKeyName(node)) problems.push(`${where(node)} the signal family names scopeKey`);
    });
    return problems;
  }

  // Locals whose value reads a scopeKey, so `const scope = scopeKey; emit({ scope })` is seen too.
  const derived = new Set<string>();
  forEachDescendant(sourceFile, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && mentionsScopeKey(node.initializer)) {
      derived.add(node.name.text);
    }
  });
  const readsScopeKey = (node: ts.Node) => {
    let found = false;
    forEachDescendant(node, (child) => {
      if (found) return;
      if (isScopeKeyName(child)) found = true;
      // A local read, not a property name: `x.scope` names a property and is not the local `scope`.
      else if (
        ts.isIdentifier(child) &&
        derived.has(child.text) &&
        !(ts.isPropertyAccessExpression(child.parent) && child.parent.name === child) &&
        !(ts.isPropertyAssignment(child.parent) && child.parent.name === child)
      ) found = true;
    });
    return found;
  };

  forEachDescendant(sourceFile, (node) => {
    if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      ROUTING_FIELDS.has(node.name.text) && readsScopeKey(node.initializer)) {
      problems.push(`${where(node)} signal ${node.name.text} is derived from scopeKey`);
    }
    if (ts.isShorthandPropertyAssignment(node) && ROUTING_FIELDS.has(node.name.text) && derived.has(node.name.text)) {
      problems.push(`${where(node)} signal ${node.name.text} is derived from scopeKey`);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ADDRESS_CONSTRUCTOR.test(node.expression.text) &&
      node.arguments.some(readsScopeKey)) {
      problems.push(`${where(node)} a signal address is built from scopeKey`);
    }
  });
  return problems;
}

/*
 * The rule proves itself before it reads the tree, so a validator that has quietly stopped matching
 * fails here rather than passing everything.
 */
const refused = findProblems("components/example.tsx", [
  "const scope = props.scopeKey;",
  "emit({ scope, channel: \"x\" });",
  "emit({ receiver: `cms:${scopeKey}` });",
  "createPhiSignalAddress(\"cms\", config.scopeKey);",
].join("\n"));
assert.equal(refused.length, 3, `The scopeKey rule must refuse each derived route:\n${refused.join("\n")}`);
assert.equal(findProblems("helpers/signal-example.ts", "export type T = { scopeKey: string };").length, 1);
assert.deepEqual(findProblems("components/example.tsx", [
  "const scopeKey = readScope();",
  "emitCapability(\"bindingParamsChange\", { params: { area, kind, scopeKey } });",
  "const store = useStore(scopeKey); emit({ scope: \"page\", value: store.scope });",
].join("\n")), [], "A scopeKey carried as data, or a property merely named like a derived local, is allowed.");

const problems = sourcePaths.flatMap((path) => findProblems(path, readFileSync(resolve(path), "utf8")));
assert.deepEqual(
  problems,
  [],
  `A signal route is never derived from a scopeKey (SIGNALS.md, "Scopes"); carry it in \`value\` instead:\n${problems.join("\n")}`,
);

console.log("Signal scopeKey separation validated.");
