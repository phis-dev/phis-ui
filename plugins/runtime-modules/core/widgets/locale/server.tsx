import { getResolvedSiteConfig } from "../../../../../gateway/site-config";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiBlockRuntime } from "../../../../../types";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiLocaleWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis">;
  interactive?: boolean;
};

export async function PhiLocaleWidget({
  runtime,
  interactive = true,
}: PhiLocaleWidgetProps) {
  if (runtime.area !== "public") {
    return null;
  }

  const rt = phiRuntime(runtime);
  const site = await getResolvedSiteConfig({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    siteKey: rt.siteKey,
  });
  const localeOptions = (site.availableLocales ?? []).map((localeOption) => ({
    code: localeOption.code,
    label: localeOption.label,
  }));
  const mode = site.theme?.widgets?.locale?.mode ?? "compact-pill";
  const showText = site.theme?.widgets?.locale?.showText ?? true;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Locale}
      componentProps={{
        currentLocale: runtime.locale.current,
        localeOptions,
        mode,
        showText,
        interactive,
      }}
    />
  );
}
