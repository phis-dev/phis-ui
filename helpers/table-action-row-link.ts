import { isPhiExternalHref } from "./external-href";
import type { PhiTableActionDefinition } from "../types/table-widget";

/**
 * The action with the address one row gives it, where it reads one (`hrefPath`).
 *
 * The row's address is the row's own -- an entry's review page, a ticket's link elsewhere -- and wins
 * over the action's target. A row with nothing at the path leaves the action as it was resolved.
 */
export function resolvePhiTableRowActionLink<TAction extends PhiTableActionDefinition>(
  action: TAction,
  rowHref: unknown,
): TAction {
  if (!action.hrefPath || typeof rowHref !== "string" || !rowHref.trim()) return action;
  const newTab = action.newTab === true;
  // A new tab is an anchor's to open: a route of the Site taken in place never opens one.
  return { ...action, link: { href: rowHref, newTab, external: newTab || isPhiExternalHref(rowHref) } };
}
