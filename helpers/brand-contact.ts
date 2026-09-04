import type { PhiBlockRuntime } from "../types";

function normalizeContactHost(hostname: string | undefined) {
  const normalized = hostname?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return normalized.replace(/^www\./, "");
}

/**
 * The one way to reach whoever runs this Site.
 *
 * Two presets need it now -- the Area Shell, and the Public landing page, which draws its own header
 * and footer because no Shell is drawn around it. They have to agree: a landing page offering a
 * different address than the footer one click away is a bug the operator only hears about from a
 * customer.
 */
export function resolvePhiBrandContact(runtime: PhiBlockRuntime) {
  return {
    label: runtime.site.theme?.contact?.label?.trim() || "Contact",
    href:
      runtime.site.theme?.contact?.href?.trim() ||
      (() => {
        const host = normalizeContactHost(runtime.site.hostname);
        return host ? `mailto:info@${host}` : "mailto:info@example.com";
      })(),
    icon: runtime.site.theme?.contact?.icon?.trim() || "antd:mail",
  };
}
