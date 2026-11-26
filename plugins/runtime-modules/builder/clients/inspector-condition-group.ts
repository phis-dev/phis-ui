import { isPhiRecord } from "../../../../helpers/is-record";
import { readPhiRuntimeConditionExpression } from "../../../../types/runtime-condition";

/*
 * What the Inspector does with a `condition-group` field after an edit (`PhiCmsConfigField`, type
 * "condition-group"). It writes nothing the strict reader refuses, so a Widget never fails to draw over
 * a group that is half written:
 *
 * - no condition left: the key goes, the Widget has no condition there;
 * - a group the reader accepts: written, with `match: "all"` where none was chosen yet -- the first
 *   condition added brings it;
 * - a group the reader refuses (a Controller condition without its address): held in the dialog as a
 *   draft and not written until it is complete.
 */
export type PhiInspectorConditionGroupWrite =
  | { kind: "write"; value: { match: "all" | "any"; conditions: Record<string, unknown>[] } }
  | { kind: "remove" }
  | { kind: "hold"; draft: { match: "all" | "any"; conditions: Record<string, unknown>[] } };

export function resolvePhiInspectorConditionGroupWrite(next: Record<string, unknown>): PhiInspectorConditionGroupWrite {
  const conditions = Array.isArray(next.conditions) ? next.conditions.filter(isPhiRecord) : [];
  if (conditions.length === 0) return { kind: "remove" };
  const group = { match: next.match === "any" ? "any" as const : "all" as const, conditions };
  return readPhiRuntimeConditionExpression(group) ? { kind: "write", value: group } : { kind: "hold", draft: group };
}
