import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import ts from "typescript";

/**
 * A signal sent while handling another signal keeps the correlation id it was caused by.
 *
 * The rule is stated in AGENTS.md and README.md: the bus creates a correlation centrally when a user
 * interaction starts, and every feedback or state change caused by that interaction carries the same
 * id. What makes it worth validating is the default -- `dispatchSignal` mints a *fresh* id when none
 * is passed, so a reply that forgets to carry one still looks correlated and is not. Nothing warns,
 * and a listener that later filters on the id silently never matches.
 *
 * Two shapes of reply are reachable without following values around the program, and both are checked:
 *
 *   1. A signal built inside a listener callback.
 *   2. A signal built by a local helper that a listener calls, where the helper is handed no
 *      correlation of its own -- `publishSlotMeta()` answering a `stackMeta` request was exactly this.
 *
 * A reply that genuinely starts a new exchange writes `correlationId: createPhiSignalCorrelationId()`
 * and says so. That is the point: beginning a new correlation is a decision, not a default one falls
 * into by leaving a field out.
 *
 * What this cannot see is a helper declared in another module, or one reached through a value. Those
 * stay a matter of review -- but the two forms above are where every case in this package lives.
 */

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

const sourcePaths = execFileSync(
  "git",
  ["ls-files", "*.ts", "*.tsx"],
  { cwd: packageRoot, encoding: "utf8" },
)
  .split("\n")
  .filter((path) => path && !path.startsWith("scripts/") && !path.includes(".test."));

/** The envelope, and deliberately not a declared route: a route names a `routeKey` or a capability. */
function isSignalEnvelope(node: ts.Node): node is ts.ObjectLiteralExpression {
  if (!ts.isObjectLiteralExpression(node)) {
    return false;
  }
  const keys = new Set(
    node.properties
      .map((property) => (property.name && ts.isIdentifier(property.name) ? property.name.text : null))
      .filter((name): name is string => name != null),
  );
  return keys.has("receiver")
    && keys.has("channel")
    && keys.has("action")
    && !keys.has("routeKey")
    && !keys.has("capabilityId");
}

function readCorrelationProperty(node: ts.ObjectLiteralExpression) {
  return node.properties.find(
    (property) => property.name && ts.isIdentifier(property.name) && property.name.text === "correlationId",
  ) ?? null;
}

/**
 * A correlation id is passed along or minted; it is never written out.
 *
 * A string of one's own -- `"groups-written"`, or a template built from the row it happens to concern --
 * reads like a correlation and is none: every occurrence carries the same id, so two exchanges running
 * at once are indistinguishable, and a listener filtering on it matches both or neither.
 */
function namesAnInventedCorrelation(property: ts.ObjectLiteralElementLike) {
  if (!ts.isPropertyAssignment(property)) {
    return false;
  }
  const value = property.initializer;
  if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
    // `signal.correlationId ?? "..."` -- the field is required, so the right-hand side is unreachable.
    return true;
  }
  return ts.isStringLiteral(value)
    || ts.isTemplateExpression(value)
    || ts.isNoSubstitutionTemplateLiteral(value);
}

/** `usePhiSignalListener(fn)` and `usePhiSignalListener(useCallback(fn, deps))` are the same listener. */
function unwrapCallback(node: ts.Expression | undefined): ts.ArrowFunction | ts.FunctionExpression | null {
  let candidate = node;
  while (candidate && ts.isCallExpression(candidate)) {
    candidate = candidate.arguments[0];
  }
  return candidate && (ts.isArrowFunction(candidate) || ts.isFunctionExpression(candidate))
    ? candidate
    : null;
}

function forEachDescendant(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node);
  ts.forEachChild(node, (child) => forEachDescendant(child, visit));
}

/*
 * The premise this whole check rests on. If the bus ever rejected an uncorrelated signal, or left the
 * field empty, a forgotten reply would announce itself and none of the below would be needed -- so the
 * line that quietly substitutes a fresh id is the reason the rule cannot be left to care.
 */
{
  const busSource = readFileSync(
    new URL("components/runtime/runtime-signal-bus.tsx", new URL(packageRoot, "file:")),
    "utf8",
  );
  assert.match(
    busSource,
    /correlationId: signal\.correlationId \?\? createPhiSignalCorrelationId\(\)/u,
    "The bus substitutes a fresh correlation id for a missing one; if that stops being true, this validator's rule changes with it.",
  );
}

const violations: string[] = [];

for (const relativePath of sourcePaths) {
  const source = readFileSync(new URL(relativePath, new URL(packageRoot, "file:")), "utf8");
  if (!source.includes("usePhiSignalListener")) {
    continue;
  }

  const sourceFile = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const locate = (node: ts.Node) =>
    `${relativePath}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;

  /*
   * Helpers in this file that build a signal without a correlation and take none as an argument.
   * Called from a listener, such a helper can only ever mint a fresh id.
   */
  const uncorrelatedHelpers = new Set<string>();
  forEachDescendant(sourceFile, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) {
      return;
    }
    const fn = unwrapCallback(node.initializer);
    if (!fn) {
      return;
    }
    if (fn.parameters.some((parameter) => /correlation/i.test(parameter.getText()))) {
      return;
    }
    let buildsUncorrelatedSignal = false;
    forEachDescendant(fn.body, (inner) => {
      if (isSignalEnvelope(inner) && !readCorrelationProperty(inner)) {
        buildsUncorrelatedSignal = true;
      }
    });
    if (buildsUncorrelatedSignal) {
      uncorrelatedHelpers.add(node.name.text);
    }
  });

  forEachDescendant(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || node.expression.getText() !== "usePhiSignalListener") {
      return;
    }
    const listener = unwrapCallback(node.arguments[0]);
    if (!listener) {
      return;
    }
    forEachDescendant(listener.body, (inner) => {
      if (isSignalEnvelope(inner)) {
        const correlation = readCorrelationProperty(inner);
        if (!correlation) {
          violations.push(`${locate(inner)} answers a signal without carrying its correlation id.`);
        } else if (namesAnInventedCorrelation(correlation)) {
          violations.push(`${locate(inner)} writes its own correlation id instead of carrying one.`);
        }
      }
      if (
        ts.isCallExpression(inner)
        && ts.isIdentifier(inner.expression)
        && uncorrelatedHelpers.has(inner.expression.text)
      ) {
        violations.push(
          `${locate(inner)} answers through ${inner.expression.text}(), which mints a new correlation id.`,
        );
      }
    });
  });
}

assert.deepEqual(
  violations,
  [],
  `A signal sent while handling another must keep its correlation id (AGENTS.md):\n  ${violations.join("\n  ")}`,
);

console.log(
  `Signal correlation contracts validated across ${sourcePaths.length} source files.`,
);
