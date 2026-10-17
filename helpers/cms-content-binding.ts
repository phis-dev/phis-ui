import type { PhiCmsContentWidgetNode } from "../types/cms";
import type { PhiCmsWidgetContentBinding } from "../types/cms-plugins";

/*
 * A Widget's bound content (phis-server CONTENT.md): the config field it names in `contentBinding` is kept
 * by phi-server apart from the tree, drafted and published apart from structure.
 */

function hasConfigValue(config: Record<string, unknown> | null | undefined, fieldKey: string) {
  const value = config?.[fieldKey];
  return typeof value === "string" ? value.trim().length > 0 : value != null;
}

/**
 * The binding that applies to this config, or `null` where the Widget's current mode keeps nothing --
 * a Markdown or HTML Widget reading a URL, an Image pointing at one.
 */
export function resolvePhiCmsWidgetContentBindingForConfig(
  binding: PhiCmsWidgetContentBinding | null | undefined,
  config: Record<string, unknown> | null | undefined,
): PhiCmsWidgetContentBinding | null {
  if (!binding) return null;
  if (binding.skipWhenConfigField && hasConfigValue(config, binding.skipWhenConfigField)) return null;
  if (
    binding.skipWhenConfigFieldValue &&
    config?.[binding.skipWhenConfigFieldValue.field] === binding.skipWhenConfigFieldValue.value
  ) {
    return null;
  }
  return binding;
}

/**
 * Whether a bound Widget has nothing to show on the live Site: no published content and no value of its
 * own. That is a Widget the Site created whose content was never published -- the Builder's placeholder
 * is not live until somebody publishes it. A preset node keeps its shipped value and is never empty.
 */
export function isPhiCmsWidgetContentUnpublished(
  binding: PhiCmsWidgetContentBinding | null | undefined,
  widget: Pick<PhiCmsContentWidgetNode, "config" | "resolvedContent">,
) {
  const applied = resolvePhiCmsWidgetContentBindingForConfig(binding, widget.config);
  return applied != null && widget.resolvedContent == null && !hasConfigValue(widget.config, applied.sourceField);
}
