/**
 * A Collection View's binding params after a `bindingParamsChange` (`{ params }`): the received ones laid
 * over the ones it has, or `null` where that changes nothing -- the same set again is no new set, so it
 * neither starts the list over nor asks the Provider again. This is what lets another Widget's choice
 * filter a Collection through a Controller that forwards it on every change of the choice
 * (COLLECTIONS.md, "Filtered by another Widget's choice"). Imports nothing.
 */
export function layPhiCollectionBindingParams(
  current: Readonly<Record<string, unknown>>,
  received: Readonly<Record<string, unknown>>,
): Record<string, unknown> | null {
  const next = { ...current, ...received };
  const unchanged = Object.keys(next).length === Object.keys(current).length &&
    Object.entries(next).every(([key, value]) => JSON.stringify(value) === JSON.stringify(current[key]));
  return unchanged ? null : next;
}
