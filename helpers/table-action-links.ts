import { resolvePhiLinkHref } from "./link-target";
import type { PhiResolvedLinkTargets } from "../types/references";
import type { PhiTableActionDefinition } from "../types/table-widget";

/**
 * The actions with where their `linkTarget` leads, for the client to draw.
 *
 * Resolved on the server, in the render that resolved every target of the page in one pass: a Page
 * reference means nothing in a browser, and the address it answers on is the server's to know. An
 * action without a target is handed back as it is; one whose target resolved to nothing carries `null`
 * and draws no link (`REFERENCES.md`).
 */
export function resolvePhiTableActionLinks<TAction extends PhiTableActionDefinition>(
  actions: readonly TAction[] | undefined,
  links: PhiResolvedLinkTargets | null | undefined,
): TAction[] | undefined {
  return actions?.map((action) => (action.linkTarget
    ? { ...action, link: resolvePhiLinkHref(action.linkTarget, links) }
    : action));
}
