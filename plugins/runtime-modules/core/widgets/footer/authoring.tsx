"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiNavItem } from "../../../../../components/shell/shell-types";
import { PhiFooterWidgetClient } from "./client";
import { PHI_FOOTER_WIDGET_DEFINITION, type PhiCmsFooterWidgetConfig } from "./config";

const FOOTER_PREVIEW_LINKS: PhiNavItem[] = [
  { key: "about", label: "About", href: "/about" },
  { key: "services", label: "Services", href: "/services" },
  { key: "contact", label: "Contact", href: "/contact" },
  { key: "privacy", label: "Privacy", href: "/privacy" },
];

export const PHI_FOOTER_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsFooterWidgetConfig> = {
  ...PHI_FOOTER_WIDGET_DEFINITION,
  renderEditor: ({ runtime, config }) => (
    <PhiFooterWidgetClient
      runtime={{ locale: runtime.locale, area: runtime.area }}
      labels={{ linksTitle: "Links", contactTitle: "Contact" }}
      brandTitle={config.brandTitle ?? runtime.site.name ?? runtime.site.key}
      brandText={config.brandText}
      links={FOOTER_PREVIEW_LINKS}
      contactItems={[
        {
          key: "email",
          label: "Email",
          value: config.contactEmailValue ?? "info@example.com",
          href: config.contactEmailHref,
        },
        ...(config.locationValue ? [{ key: "location", label: "Location", value: config.locationValue }] : []),
      ]}
      note={config.note}
    />
  ),
};
