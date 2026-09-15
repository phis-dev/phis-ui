import {
  evaluatePhiRuntimeConditionExpression,
  readPhiRuntimeConditionExpression,
  type PhiRuntimeConditionExpression,
  type PhiRuntimeFeatureState,
  type PhiRuntimePageConditionState,
} from "../types/runtime-condition";
import type { PhiBlockRuntime } from "../types";

/**
 * Whether a node appears at all, read from the node's own config rather than the Widget's.
 *
 * It sits beside `renderMode` as something every node has and no Widget type owns: a condition on the
 * node is about the placement, not about what is placed, and a Widget must not have to know that it is
 * one of two that share a slot. Reading it from the config is what lets a Preset and an authored page
 * say it the same way, without a column of its own in the tree.
 */
export function readPhiCmsNodeVisibleWhen(
  config: Record<string, unknown>,
): PhiRuntimeConditionExpression | null {
  return readPhiRuntimeConditionExpression(config.visibleWhen);
}

/**
 * The address this render was asked for, where the request said what it was.
 *
 * `null` means nobody said -- not that the query was empty -- and a condition over an absent source is
 * `unavailable` rather than false, which is what keeps a decision the server cannot make from being made
 * wrongly on the server.
 */
export function readPhiCmsServerPageConditionState(
  runtime: Pick<PhiBlockRuntime, "page" | "request">,
): PhiRuntimePageConditionState | null {
  const searchParams = runtime.request?.searchParams;
  if (!searchParams) return null;
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") query[key] = value;
  }
  return { path: runtime.page?.path ?? "", query };
}

export type PhiCmsNodeVisibility = "render" | "omit" | "gate";

/**
 * How much of a node's condition this render can settle on its own.
 *
 * Whatever the server can decide, it decides here: a node that is not to appear is never rendered at
 * all -- no Widget runs, nothing is fetched for it -- and one that is to appear needs no client boundary
 * around it. Only a condition that reads something the browser holds, such as what a neighbouring Widget
 * has yet to report, is handed to the gate. `unavailable` is exactly that case, since it means a source
 * the expression names was not among the ones offered here.
 */
/**
 * The expression as the server may read it: without the instruction for a silent sender.
 *
 * `whenUnavailable` answers "nobody has said yet", and on the server nobody has said yet about anything
 * the browser holds -- so honouring it here would settle a node that is waiting to be told, and it would
 * be settled without the gate that was going to hear the answer. It is the browser's instruction, and
 * the browser is where it applies.
 */
function stripPhiRuntimeConditionFallbacks(
  expression: PhiRuntimeConditionExpression,
): PhiRuntimeConditionExpression {
  if ("source" in expression) {
    if (expression.whenUnavailable === undefined) return expression;
    const stripped = { ...expression };
    delete stripped.whenUnavailable;
    return stripped;
  }
  return {
    match: expression.match,
    conditions: expression.conditions.map(stripPhiRuntimeConditionFallbacks),
  };
}

export function resolvePhiCmsNodeVisibility(
  visibleWhen: PhiRuntimeConditionExpression | null,
  page: PhiRuntimePageConditionState | null,
  features: PhiRuntimeFeatureState | null = null,
): PhiCmsNodeVisibility {
  if (!visibleWhen) return "render";
  const result = evaluatePhiRuntimeConditionExpression(
    stripPhiRuntimeConditionFallbacks(visibleWhen),
    { page, features },
  );
  if (result === "not-matched") return "omit";
  return result === "matched" ? "render" : "gate";
}
