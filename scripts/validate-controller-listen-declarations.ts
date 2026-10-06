import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import { forEachDescendant, unwrapCallback } from "./lib/ts-ast";
import { repositoryRoot } from "./lib/repo-root.mjs";
import { PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION } from "../plugins/runtime-modules/builder/controller/definition";

/*
 * What a Controller says it hears is what it hears.
 *
 * `runtimeSignals.listens` is what the Builder offers when somebody wires a sender to the Controller,
 * and what a reader takes for its inputs. The Builder Controller's list had drifted from its listeners:
 * a dozen channels it answers -- the Module usage and Public Route requests, the Area settings dialog,
 * the wiring Form -- were not on it, so nothing could be wired to them that the Page's own preset did
 * not already hold, and one entry named a channel the Controller had stopped reading.
 *
 * Read here: every `usePhiSignalListener` in the Builder Controller's files. A branch is a channel the
 * listener compares (`signal.channel === "x"`, or a prefix through `startsWith`) together with the
 * actions compared beside it, or inside the branch when it splits by action. Each pair must be
 * declared, and each declared pair must be answered.
 */

const CONTROLLER_FILES = [
  "plugins/runtime-modules/builder/controller/workspace-controller.tsx",
  "plugins/runtime-modules/builder/controller/page-controller.tsx",
  "plugins/runtime-modules/builder/controller/draft-status-controller.tsx",
];

type Branch = { channel: string; prefix: boolean; actions: string[]; where: string };

function isSignalMember(node: ts.Node, member: "channel" | "action") {
  return ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "signal" &&
    node.name.text === member;
}

function readComparison(node: ts.Node, member: "channel" | "action"): string | null {
  if (!ts.isBinaryExpression(node)) return null;
  const operator = node.operatorToken.kind;
  if (operator !== ts.SyntaxKind.EqualsEqualsEqualsToken && operator !== ts.SyntaxKind.ExclamationEqualsEqualsToken) {
    return null;
  }
  if (isSignalMember(node.left, member) && ts.isStringLiteral(node.right)) return node.right.text;
  if (isSignalMember(node.right, member) && ts.isStringLiteral(node.left)) return node.left.text;
  return null;
}

function readPrefix(node: ts.Node): string | null {
  return ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "startsWith" &&
    isSignalMember(node.expression.expression, "channel") &&
    node.arguments[0] &&
    ts.isStringLiteral(node.arguments[0])
    ? node.arguments[0].text
    : null;
}

/** The whole `&&`/`||` condition a comparison stands in. */
function readConditionRoot(node: ts.Node) {
  let current = node;
  while (
    current.parent &&
    (ts.isParenthesizedExpression(current.parent) ||
      (ts.isBinaryExpression(current.parent) &&
        (current.parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          current.parent.operatorToken.kind === ts.SyntaxKind.BarBarToken)))
  ) {
    current = current.parent;
  }
  return current;
}

function collectActions(node: ts.Node) {
  const actions = new Set<string>();
  forEachDescendant(node, (child) => {
    const action = readComparison(child, "action");
    if (action) actions.add(action);
  });
  return actions;
}

function readBranches(relativePath: string): Branch[] {
  const source = readFileSync(path.join(repositoryRoot, relativePath), "utf8");
  const sourceFile = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const branches: Branch[] = [];
  forEachDescendant(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== "usePhiSignalListener") {
      return;
    }
    const listener = unwrapCallback(node.arguments[0]);
    if (!listener) return;
    forEachDescendant(listener.body, (child) => {
      const channel = readComparison(child, "channel");
      const prefix = channel ? null : readPrefix(child);
      if (channel == null && prefix == null) return;
      const root = readConditionRoot(child);
      const actions = collectActions(root);
      if (actions.size === 0 && root.parent && ts.isIfStatement(root.parent) && root.parent.expression === root) {
        for (const action of collectActions(root.parent.thenStatement)) actions.add(action);
      }
      const line = sourceFile.getLineAndCharacterOfPosition(child.getStart()).line + 1;
      branches.push({
        channel: channel ?? prefix!,
        prefix: channel == null,
        actions: [...actions],
        where: `${relativePath}:${line}`,
      });
    });
  });
  return branches;
}

const declared = PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION.runtimeSignals.listens.map((capability) => ({
  channel: capability.channel,
  action: capability.action,
}));

const branches = CONTROLLER_FILES.flatMap(readBranches);
assert.ok(branches.length > 0, "No Builder Controller listener branches found; this validator reads nothing and is stale.");

const undeclared: string[] = [];
const answered = new Set<string>();
for (const branch of branches) {
  if (branch.actions.length === 0) {
    undeclared.push(`${branch.where} reads channel "${branch.channel}" without naming an action.`);
    continue;
  }
  for (const action of branch.actions) {
    const matches = declared.filter((capability) =>
      capability.action === action &&
      (branch.prefix ? capability.channel.startsWith(branch.channel) : capability.channel === branch.channel));
    if (matches.length === 0) {
      undeclared.push(`${branch.where} answers "${branch.channel}${branch.prefix ? "*" : ""}" / "${action}", which listens does not declare.`);
    }
    for (const capability of matches) answered.add(`${capability.channel}\u0000${capability.action}`);
  }
}

const unanswered = declared
  .filter((capability) => !answered.has(`${capability.channel}\u0000${capability.action}`))
  .map((capability) => `listens declares "${capability.channel}" / "${capability.action}", which no listener answers.`);

assert.deepEqual(
  [...undeclared, ...unanswered],
  [],
  `The Builder Controller's listens and its listeners disagree (SIGNALS.md, "Capabilities and routes"):\n  ${[...undeclared, ...unanswered].join("\n  ")}`,
);

console.log(`validate-controller-listen-declarations: ${branches.length} branches, ${declared.length} declared listens agree.`);
