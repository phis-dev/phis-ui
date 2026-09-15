import { PHI_TR_CTX_WEB_UI_LABEL, createSiteTranslator } from "../../../../../gateway/tr";
import type { PhiBlockRuntime } from "../../../../../types";
import { PHI_RESULT_HOME_LINK_SOURCE_LABEL, type PhiCmsResultWidgetConfig } from "./config";
import { localizeAreaPath } from "../../../../../helpers/locale";
import { PhiResultWidgetBody } from "../../../../../components/widgets/shared/result-body";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";

export type PhiResultWidgetProps = {
  config?: PhiCmsResultWidgetConfig;
  runtime: PhiBlockRuntime;
};

async function resolveResultText({
  config,
  runtime,
}: {
  config?: PhiCmsResultWidgetConfig;
  runtime: PhiBlockRuntime;
}) {
  const code = config?.code?.trim();
  const title = config?.title?.trim();
  const subTitle = config?.subTitle?.trim();
  const homeLinkLabel = config?.homeLinkLabel?.trim() || PHI_RESULT_HOME_LINK_SOURCE_LABEL;
  const shouldTranslate =
    config?.translate !== false &&
    config?.renderMode !== "preview" &&
    config?.renderMode !== "editor" &&
    Boolean(readPhiServerApiCredentials().apiBaseUrl.trim()) &&
    Boolean(readPhiServerApiCredentials().internalToken.trim()) &&
    Boolean(runtime.site.key.trim()) &&
    Boolean(runtime.locale.current.trim());

  if (!shouldTranslate) {
    return { code, title, subTitle, homeLinkLabel };
  }

  const translator = createSiteTranslator({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    siteKey: runtime.site.key,
    locale: runtime.locale.current,
  });
  const sourceTexts = [title ?? "", subTitle ?? "", homeLinkLabel];
  const translated = await translator.trBulk(sourceTexts, PHI_TR_CTX_WEB_UI_LABEL);

  return {
    code,
    title: translated[0]?.trim() || title,
    subTitle: translated[1]?.trim() || subTitle,
    homeLinkLabel: translated[2]?.trim() || homeLinkLabel,
  };
}

export async function PhiResultWidget({ config, runtime }: PhiResultWidgetProps) {
  const { code, title, subTitle, homeLinkLabel } = await resolveResultText({ config, runtime });
  /*
   * Resolved here rather than configured: the root of the Area this result was rendered in, in the
   * locale it was rendered for. `localizeAreaPath` is the same answer the navigation gives.
   */
  const homeHref = config?.homeLink
    ? localizeAreaPath(runtime.locale.current, runtime.area, "/")
    : undefined;
  return (
    <PhiResultWidgetBody
      config={config}
      code={code}
      title={title}
      subTitle={subTitle}
      homeHref={homeHref}
      homeLinkLabel={homeLinkLabel}
    />
  );
}
