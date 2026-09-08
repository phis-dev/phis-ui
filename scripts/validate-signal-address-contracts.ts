import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import ts from "typescript";

/**
 * A listener that reads signals addressed to an address must name that address.
 *
 * The bus holds an addressed signal until somebody answers for its receiver, and it counts a listener
 * as answering only for the addresses it declares -- as the third argument to `usePhiSignalListener`,
 * or as `receiver` in its filter. A listener that merely compares `signal.receiver` inside its body
 * has told the bus nothing, so every signal sent to it waits forever.
 *
 * It waits *silently*, which is why this is worth a validator rather than a convention. Nothing throws
 * and nothing is dropped; the sender's own state moves on, so the half that sent the signal keeps
 * looking right. The Theme Controller went that way: every draft a Widget sent it was held, the
 * Controller never learned of a change, and the fault surfaced only when a Root Background appeared in
 * its Control and in no preview -- colours had covered for it, because a preview resolves those from
 * the theme it was rendered with and merely looked stale.
 *
 * The rule is per address, not per listener: naming one of the two addresses a listener answers for
 * leaves the other exactly as stranded.
 *
 * A comparison against a string literal is not an address. `signal.receiver === "broadcast"` asks
 * whether the signal was addressed to nobody in particular, which needs no registration at all.
 */

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const resolve = (relativePath: string) => new URL(relativePath, new URL(packageRoot, "file:"));

/* The premise: delivery is gated on the registered listener count for the receiver's address. */
assert.match(
  readFileSync(resolve("components/runtime/runtime-signal-bus.tsx"), "utf8"),
  /receiverListenerCounts/u,
  "The bus decides deliverability from the listeners registered per address; if that changes, this validator's rule changes with it.",
);

const sourcePaths = execFileSync("git", ["ls-files", "*.ts", "*.tsx"], { cwd: packageRoot, encoding: "utf8" })
  .split("\n")
  .filter((path) => path && !path.startsWith("scripts/") && !path.includes(".test."));

function forEachDescendant(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node);
  ts.forEachChild(node, (child) => forEachDescendant(child, visit));
}

/** `usePhiSignalListener(fn)` and `usePhiSignalListener(useCallback(fn, deps))` are the same listener. */
function unwrapCallback(node: ts.Expression | undefined): ts.ArrowFunction | ts.FunctionExpression | null {
  let candidate = node;
  while (candidate && ts.isCallExpression(candidate)) {
    candidate = candidate.arguments[0];
  }
  return candidate && (ts.isArrowFunction(candidate) || ts.isFunctionExpression(candidate)) ? candidate : null;
}

/**
 * One address, written the way the file happens to write it.
 *
 * A listener compares against a local name and declares the call that produced it, or the other way
 * round; `?? undefined` is how an optional address is fitted to the parameter. Neither says anything
 * about which address it is, so both are resolved away before the two sides are compared.
 */
function createAddressReader(sourceFile: ts.SourceFile) {
  const aliases = new Map<string, ts.Expression>();
  forEachDescendant(sourceFile, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      let initializer = node.initializer;
      // `useMemo(() => expr, deps)` holds the address the same way a plain const does.
      while (ts.isCallExpression(initializer) && initializer.arguments[0]) {
        const inner = initializer.arguments[0];
        if (!ts.isArrowFunction(inner) || !inner.body || ts.isBlock(inner.body)) {
          break;
        }
        initializer = inner.body;
      }
      aliases.set(node.name.text, initializer);
    }
  });

  const strip = (node: ts.Expression): ts.Expression => {
    if (ts.isParenthesizedExpression(node)) {
      return strip(node.expression);
    }
    if (
      ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      && (node.right.kind === ts.SyntaxKind.UndefinedKeyword
        || node.right.kind === ts.SyntaxKind.NullKeyword
        || normalizeText(node.right) === "undefined")
    ) {
      return strip(node.left);
    }
    return node;
  };

  return function readAddress(node: ts.Expression, depth = 0): string {
    const stripped = strip(node);
    const text = normalizeText(stripped);
    const alias = depth < 3 && ts.isIdentifier(stripped) ? aliases.get(stripped.text) : undefined;
    return alias ? readAddress(alias, depth + 1) : text;
  };
}

const normalizeText = (node: ts.Node) => node.getText().replace(/\s+/gu, " ").trim();

/** The addresses a listener declares: the third argument, or `receiver` anywhere in its filter. */
function readDeclaredAddresses(call: ts.CallExpression, readAddress: (node: ts.Expression) => string) {
  const declared = new Set<string>();
  const add = (node: ts.Expression) => {
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) {
        declared.add(readAddress(element));
      }
      return;
    }
    declared.add(readAddress(node));
  };

  const ready = call.arguments[2];
  if (ready) {
    add(ready);
  }
  const filter = call.arguments[1];
  if (filter) {
    // The filter is often built conditionally, so the property is looked for rather than indexed.
    forEachDescendant(filter, (node) => {
      if (
        ts.isPropertyAssignment(node)
        && node.name
        && ts.isIdentifier(node.name)
        && node.name.text === "receiver"
      ) {
        add(node.initializer);
      }
    });
  }
  return declared;
}

/** The addresses a listener reads for: `signal.receiver === x`, where `x` is not a string literal. */
function readComparedAddresses(
  listener: ts.ArrowFunction | ts.FunctionExpression,
  readAddress: (node: ts.Expression) => string,
) {
  const parameter = listener.parameters[0]?.name;
  const compared = new Set<string>();
  if (!parameter || !ts.isIdentifier(parameter) || !listener.body) {
    return compared;
  }
  const receiverOf = `${parameter.text}.receiver`;

  forEachDescendant(listener.body, (node) => {
    if (!ts.isBinaryExpression(node)) {
      return;
    }
    const { operatorToken, left, right } = node;
    if (
      operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken
      && operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken
    ) {
      return;
    }
    const [subject, value] = normalizeText(left) === receiverOf
      ? [left, right]
      : normalizeText(right) === receiverOf
        ? [right, left]
        : [null, null];
    if (!subject || !value || ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
      return;
    }
    compared.add(readAddress(value));
  });
  return compared;
}

/**
 * Addresses a listener reads for without answering for them, because their owner already does.
 *
 * Reading is not owning. A Widget or Controller may listen in on an exchange addressed elsewhere, and
 * that is sound as long as the address is registered by whoever it belongs to -- delivery is decided
 * once, per address, not per listener. Claiming it a second time here would say this listener is the
 * one to keep it alive, which it is not.
 *
 * Each entry names why, so that an address whose owner disappears is not left looking deliberate.
 */
const READS_FOR_ANOTHERS_ADDRESS = new Map<string, string>([
  [
    "plugins/runtime-modules/builder/workspace-controller.tsx:PHI_BUILDER_SIGNAL_WIRING_FORM_CONTROLLER_ADDRESS",
    "The runtime Form Controller mount owns this address and names it (components/forms/runtime-form-controller-mount.tsx); the Builder follows the wiring form's traffic.",
  ],
]);

const violations: string[] = [];

for (const relativePath of sourcePaths) {
  const source = readFileSync(resolve(relativePath), "utf8");
  if (!source.includes("usePhiSignalListener")) {
    continue;
  }

  const sourceFile = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const readAddress = createAddressReader(sourceFile);

  forEachDescendant(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || node.expression.getText() !== "usePhiSignalListener") {
      return;
    }
    const listener = unwrapCallback(node.arguments[0]);
    if (!listener) {
      return;
    }
    const declared = readDeclaredAddresses(node, readAddress);
    const missing = [...readComparedAddresses(listener, readAddress)]
      .filter((address) => !declared.has(address))
      .filter((address) => !READS_FOR_ANOTHERS_ADDRESS.has(`${relativePath}:${address}`));
    if (missing.length === 0) {
      return;
    }
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    violations.push(
      `${relativePath}:${line} reads signals addressed to ${missing.join(", ")} without answering for ${missing.length === 1 ? "it" : "them"}.`,
    );
  });
}

assert.deepEqual(
  violations,
  [],
  `A listener must name the addresses it reads for, or the bus holds their signals forever (AGENTS.md):\n  ${violations.join("\n  ")}`,
);

console.log(`Signal address contracts validated across ${sourcePaths.length} source files.`);
