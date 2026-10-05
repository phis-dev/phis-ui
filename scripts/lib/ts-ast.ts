// Why this file exists: `forEachDescendant` and `unwrapCallback` stood word for word in
// validate-signal-address-contracts.ts and validate-signal-correlation-contracts.ts.
import ts from "typescript";

/** Calls `visit` on `node` and then on every node below it, depth first. */
export function forEachDescendant(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node);
  ts.forEachChild(node, (child) => forEachDescendant(child, visit));
}

/** `usePhiSignalListener(fn)` and `usePhiSignalListener(useCallback(fn, deps))` are the same listener. */
export function unwrapCallback(node: ts.Expression | undefined): ts.ArrowFunction | ts.FunctionExpression | null {
  let candidate = node;
  while (candidate && ts.isCallExpression(candidate)) {
    candidate = candidate.arguments[0];
  }
  return candidate && (ts.isArrowFunction(candidate) || ts.isFunctionExpression(candidate)) ? candidate : null;
}
