import { getResolvedSiteConfig } from "../../../../../gateway/site-config";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiBlockRuntime } from "../../../../../types";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiBrandWidgetClientProps, PhiBrandWidgetConfig } from "./client";

export type PhiBrandWidgetProps = Pick<
  PhiBrandWidgetClientProps,
  "fallbackTitle" | "fallbackEyebrow" | "interactive"
> & {
  runtime: Pick<PhiBlockRuntime, "site" | "phis">;
  showLogo?: boolean;
  logoYOffset?: number;
};

export async function PhiBrandWidget({
  runtime,
  fallbackTitle,
  fallbackEyebrow,
  interactive,
  showLogo,
  logoYOffset,
}: PhiBrandWidgetProps) {
  const rt = phiRuntime(runtime);
  const site = await getResolvedSiteConfig({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    siteKey: rt.siteKey,
  });
  const config: PhiBrandWidgetConfig = {
    brand: site.theme?.brand ?? null,
    showLogo,
    logoYOffset,
  };

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Brand}
      componentProps={{
        config,
        fallbackTitle,
        fallbackEyebrow,
        interactive,
      }}
    />
  );
}
