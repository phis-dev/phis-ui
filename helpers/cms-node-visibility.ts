import {
  collectPhiRuntimeValueConditions,
  evaluatePhiRuntimeConditionExpression,
  matchesPhiRuntimeValueCondition,
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
 * The feature namespaces a condition reads: the first segment of every `feature` value path.
 *
 * A page collects these to know which Modules to ask (`server-helpers/cms-node-features.ts`), and the
 * renderer reads them again per node to tell a node that waits for the browser from one whose Module
 * could not be asked at all.
 */
export function collectPhiCmsNodeFeatureNamespaces(
  visibleWhen: PhiRuntimeConditionExpression | null,
): Set<string> {
  const namespaces = new Set<string>();
  if (!visibleWhen) return namespaces;
  for (const condition of collectPhiRuntimeValueConditions(visibleWhen)) {
    if (condition.source !== "feature") continue;
    const namespace = condition.valuePath.split(".")[0]?.trim() ?? "";
    if (namespace) namespaces.add(namespace);
  }
  return namespaces;
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

/** Whether a condition reads the record the Page is about, which only the server can answer. */
export function readsPhiCmsNodeRecord(visibleWhen: PhiRuntimeConditionExpression | null): boolean {
  return collectPhiRuntimeValueConditions(visibleWhen).some((condition) => condition.source === "record");
}

/**
 * What a `record` condition is judged against in one render.
 *
 * `fields` is the record the Page is about, each field as the value it has -- the same fields, by the same
 * keys, a Widget's `recordField` reads -- or null on a Page that is about no record. `live` is whether the
 * node renders for the live Site: there, a node that asks about a record that is not there stays away.
 * In the Builder it is drawn, because a template open without a record is still to be edited, and its
 * bound Widgets show their own content in the record's place.
 */
export type PhiCmsNodeRecordConditionState = {
  fields: Readonly<Record<string, unknown>> | null;
  live: boolean;
};

/**
 * A node's condition with every `record` part answered, before anything else of it is.
 *
 * `false` is a condition that cannot hold whatever the rest of it says, `null` one that holds whatever
 * the rest says (or no condition at all), and an expression is what is left to answer -- the parts that
 * do not read the record, as `resolvePhiCmsNodeVisibility` and, where it has to, the gate take them.
 * The record is answered here and taken out, not handed on: the gate runs in the browser, which never
 * sees the record, so a part about it would leave the node waiting for an answer nobody can give.
 */
export function settlePhiCmsNodeRecordConditions(
  visibleWhen: PhiRuntimeConditionExpression | null,
  record: PhiCmsNodeRecordConditionState,
): PhiRuntimeConditionExpression | null | false {
  if (!visibleWhen || !readsPhiCmsNodeRecord(visibleWhen)) return visibleWhen;
  if ("source" in visibleWhen) {
    if (record.fields == null) return record.live ? false : null;
    return matchesPhiRuntimeValueCondition(visibleWhen, { record: record.fields }) ? null : false;
  }
  const decisive = visibleWhen.match === "all" ? false : null;
  const rest: PhiRuntimeConditionExpression[] = [];
  for (const condition of visibleWhen.conditions) {
    const settled = settlePhiCmsNodeRecordConditions(condition, record);
    if (settled === decisive) return decisive;
    if (settled) rest.push(settled);
  }
  if (rest.length === 0) return visibleWhen.match === "all" ? null : false;
  return rest.length === 1 ? rest[0]! : { match: visibleWhen.match, conditions: rest };
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
