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
 * Three shapes of reply are reachable without following values around the program:
 *
 *   1. A signal built inside a listener callback.
 *   2. A signal built by a helper the listener calls, where the helper can take no correlation --
 *      `publishSlotMeta()` answering a `stackMeta` request was exactly this.
 *   3. A helper that takes a correlation and is called without one. Being able to carry it is not
 *      carrying it, and the Theme Controller's `publishDraft` was the case that proved the difference.
 *
 * Reaching the bus indirectly is still reaching it, so "sends a signal" is transitive: `publishDraft`
 * builds no envelope of its own and gets there through `emitThemeState`.
 *
 * Names are resolved through the scope chain rather than per file, because one file holds several
 * components and they name their helpers alike -- three different `publishDraft` live in the Theme
 * client alone, and taking the last one seen let the first one's call sites through.
 *
 * A reply that genuinely starts a new exchange writes `correlationId: createPhiSignalCorrelationId()`
 * and says so. That is the point: beginning a new correlation is a decision, not a default one falls
 * into by leaving a field out.
 *
 * What this cannot see is a helper imported from another module. Those stay a matter of review.
 */

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const resolve = (relativePath: string) => new URL(relativePath, new URL(packageRoot, "file:"));

/*
 * The premise the whole check rests on. If the bus rejected an uncorrelated signal, or left the field
 * empty, a forgotten reply would announce itself and none of the below would be needed -- so the line
 * that quietly substitutes a fresh id is the reason the rule cannot be left to care.
 */
assert.match(
  readFileSync(resolve("components/runtime/runtime-signal-bus.tsx"), "utf8"),
  /correlationId: signal\.correlationId \?\? createPhiSignalCorrelationId\(\)/u,
  "The bus substitutes a fresh correlation id for a missing one; if that stops being true, this validator's rule changes with it.",
);

const sourcePaths = execFileSync("git", ["ls-files", "*.ts", "*.tsx"], { cwd: packageRoot, encoding: "utf8" })
  .split("\n")
  .filter((path) => path && !path.startsWith("scripts/") && !path.includes(".test."));

type CorrelationParameter = { index: number; asOption: boolean };
type Helper = {
  name: string;
  scope: ts.Node | null;
  buildsEnvelope: boolean;
  buildsUncorrelated: boolean;
  calls: ts.CallExpression[];
  correlation: CorrelationParameter | null;
};
type HelperFunction = ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration;

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
 * at once are indistinguishable, and a listener filtering on it matches both or neither. `?? "..."`
 * says the same thing more quietly, over a field the envelope requires.
 */
function namesAnInventedCorrelation(property: ts.ObjectLiteralElementLike) {
  if (!ts.isPropertyAssignment(property)) {
    return false;
  }
  const value = property.initializer;
  if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
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
  return candidate && (ts.isArrowFunction(candidate) || ts.isFunctionExpression(candidate)) ? candidate : null;
}

function forEachDescendant(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node);
  ts.forEachChild(node, (child) => forEachDescendant(child, visit));
}

/** The functions a node sits inside, innermost first, ending with `null` for the file itself. */
function scopeChain(node: ts.Node): (ts.Node | null)[] {
  const chain: (ts.Node | null)[] = [];
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current) || ts.isFunctionDeclaration(current)) {
      chain.push(current);
    }
  }
  chain.push(null);
  return chain;
}

const violations: string[] = [];

for (const relativePath of sourcePaths) {
  const source = readFileSync(resolve(relativePath), "utf8");
  if (!source.includes("usePhiSignalListener")) {
    continue;
  }

  const sourceFile = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const locate = (node: ts.Node) =>
    `${relativePath}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;

  const helpers: Helper[] = [];
  const describe = (name: ts.Identifier, fn: HelperFunction) => {
    if (!fn.body) {
      return;
    }
    const helper: Helper = {
      name: name.text,
      scope: scopeChain(name)[0] ?? null,
      buildsEnvelope: false,
      buildsUncorrelated: false,
      calls: [],
      correlation: null,
    };
    forEachDescendant(fn.body, (inner) => {
      if (isSignalEnvelope(inner)) {
        helper.buildsEnvelope = true;
        helper.buildsUncorrelated ||= !readCorrelationProperty(inner);
        return;
      }
      if (ts.isCallExpression(inner) && ts.isIdentifier(inner.expression)) {
        helper.calls.push(inner);
      }
    });
    const index = fn.parameters.findIndex((parameter) => /correlation/i.test(parameter.getText()));
    if (index >= 0) {
      helper.correlation = {
        index,
        // A parameter that is the correlation, versus an options object that has a field for it.
        asOption: !/correlation/i.test(fn.parameters[index].name.getText()),
      };
    }
    helpers.push(helper);
  };

  forEachDescendant(sourceFile, (node) => {
    // `const send = useCallback(fn)`, `const send = fn`, and `function send()` are the same helper.
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const fn = unwrapCallback(node.initializer);
      if (fn) {
        describe(node.name, fn);
      }
      return;
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      describe(node.name, node);
    }
  });

  /** The helper a name means where it is written: the innermost declaration in scope, as JS resolves it. */
  const resolveHelper = (call: ts.CallExpression) => {
    if (!ts.isIdentifier(call.expression)) {
      return null;
    }
    const named = helpers.filter((helper) => helper.name === (call.expression as ts.Identifier).text);
    if (named.length === 0) {
      return null;
    }
    for (const scope of scopeChain(call)) {
      const match = named.find((helper) => helper.scope === scope);
      if (match) {
        return match;
      }
    }
    return null;
  };

  /* Reaching the bus indirectly is still reaching it: settle who sends before asking who carries. */
  const sends = new Set(helpers.filter((helper) => helper.buildsEnvelope));
  for (let settled = false; !settled;) {
    settled = true;
    for (const helper of helpers) {
      if (sends.has(helper)) {
        continue;
      }
      if (helper.calls.some((call) => {
        const callee = resolveHelper(call);
        return callee != null && sends.has(callee);
      })) {
        sends.add(helper);
        settled = false;
      }
    }
  }

  /**
   * Whether this call hands on the correlation of the exchange it is part of.
   *
   * A helper that takes one has to be given it. A helper that takes none may still be right: it can
   * hold the correlation in its closure and pass it to what it calls, which is what a `const execute =
   * () => activateAction(..., signal.correlationId)` inside a listener does. So the question recurses
   * into the callee rather than being answered by its signature.
   */
  const verdicts = new Map<Helper, boolean>();
  function callHandsOnCorrelation(call: ts.CallExpression): boolean {
    const callee = resolveHelper(call);
    if (callee == null || !sends.has(callee)) {
      return true;
    }
    if (callee.correlation) {
      const argument = call.arguments[callee.correlation.index];
      return argument != null && (
        !callee.correlation.asOption
        || (ts.isObjectLiteralExpression(argument) && readCorrelationProperty(argument) != null)
      );
    }
    return helperHandsOnCorrelation(callee);
  }
  function helperHandsOnCorrelation(helper: Helper): boolean {
    const settled = verdicts.get(helper);
    if (settled != null) {
      return settled;
    }
    // Optimistic while recursing, so a cycle is judged by the envelopes it builds, not by itself.
    verdicts.set(helper, true);
    const verdict = !helper.buildsUncorrelated && helper.calls.every(callHandsOnCorrelation);
    verdicts.set(helper, verdict);
    return verdict;
  }

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
        return;
      }
      if (!ts.isCallExpression(inner) || callHandsOnCorrelation(inner)) {
        return;
      }
      const helper = resolveHelper(inner)!;
      violations.push(helper.correlation
        ? `${locate(inner)} answers through ${helper.name}() without the correlation it takes.`
        : `${locate(inner)} answers through ${helper.name}(), which mints a new correlation id.`);
    });
  });
}

assert.deepEqual(
  violations,
  [],
  `A signal sent while handling another must keep its correlation id (AGENTS.md):\n  ${violations.join("\n  ")}`,
);

console.log(`Signal correlation contracts validated across ${sourcePaths.length} source files.`);
