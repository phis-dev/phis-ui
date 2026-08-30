import type { ReactNode } from "react";

import type { PhiBlockRuntime } from "../../../../../types";
import { resolvePhiNavigationItems } from "../../../../../components/widgets/server/navigation-request";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiFooterWidgetLabels } from "../../../../../components/widgets/label-sets/footer";

export type PhiFooterWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer" | "request">;
  brandTitle: ReactNode;
  brandText?: ReactNode;
  contactEmailValue: ReactNode;
  contactEmailHref?: string;
  locationValue?: ReactNode;
  note?: ReactNode;
};

export async function PhiFooterWidget({
  runtime,
  brandTitle,
  brandText,
  contactEmailValue,
  contactEmailHref,
  locationValue,
  note,
}: PhiFooterWidgetProps) {
  const [fetchedLinks, labels] = await Promise.all([
    resolvePhiNavigationItems(runtime, `${runtime.area}:footer`),
    getPhiFooterWidgetLabels({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      locale: runtime.locale.current,
    }),
  ]);

  const links = fetchedLinks ?? [];

  const contactItems = [
    ...(contactEmailValue
      ? [
          {
            key: "email",
            label: labels.emailLabel,
            value: contactEmailValue,
            href:
              typeof contactEmailValue === "string"
                ? (contactEmailHref ?? `mailto:${contactEmailValue}`)
                : contactEmailHref,
          },
        ]
      : []),
    ...(locationValue
      ? [{ key: "location", label: labels.locationLabel, value: locationValue }]
      : []),
  ];

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Footer}
      componentProps={{
        runtime: { locale: runtime.locale, area: runtime.area },
        labels: {
          linksTitle: labels.linksTitle,
          contactTitle: labels.contactTitle,
        },
        brandTitle,
        brandText,
        links,
        contactItems,
        note,
      }}
    />
  );
}
