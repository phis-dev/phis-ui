/**
 * Whether the Inspector offers "Translate text" for a node.
 *
 * Only a plugin that translates its own words has the switch at all: every other node's words go through
 * the renderer's pass, which the switch does not govern. And not while the node names a field of the page
 * record (`recordField`): the record's value arrives in the page's language and the render never sends it
 * to a translator, so a switch there would be one that changes nothing.
 */
export function isPhiInspectorTranslateSwitchShown(
  plugin: { translatesOwnText?: boolean } | null | undefined,
  config: Readonly<Record<string, unknown>> | null | undefined,
): boolean {
  if (!plugin?.translatesOwnText) return false;
  const recordField = config?.recordField;
  return !(typeof recordField === "string" && recordField.trim().length > 0);
}

/**
 * Where among a Widget's visible settings fields "Translate text" stands, as the index it is inserted at.
 *
 * Right after the field that binds the Widget's words to the page record, where there is one: the two
 * answer the same question -- where the words come from -- and the switch only shows while that field is
 * None. Without one, it closes the Widget's own fields, before the next headed group: it is about the
 * words above it, and a group under a heading -- the Badge, the Link target -- is a part of its own. A
 * heading over the very first field names the Widget's own group rather than starting another.
 */
export function resolvePhiInspectorTranslateSwitchIndex(
  fields: readonly { key: string; heading?: string }[],
): number {
  const headed = fields.findIndex((field, index) => index > 0 && field.heading != null);
  const ownGroupEnd = headed === -1 ? fields.length : headed;
  const recordField = fields.findIndex((field) => field.key === "recordField");
  return recordField !== -1 && recordField < ownGroupEnd ? recordField + 1 : ownGroupEnd;
}
