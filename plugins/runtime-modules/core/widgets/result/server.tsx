import { PHI_TR_CTX_WEB_UI_LABEL, createSiteTranslator } from "../../../../../gateway/tr";
import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiCmsResultWidgetConfig } from "./config";
import { PhiResultWidgetBody } from "../../../../../components/widgets/shared/result-body";

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
  const shouldTranslate =
    config?.translate !== false &&
    config?.renderMode !== "preview" &&
    config?.renderMode !== "editor" &&
    Boolean(runtime.phis.apiBaseUrl.trim()) &&
    Boolean(runtime.phis.internalToken.trim()) &&
    Boolean(runtime.site.key.trim()) &&
    Boolean(runtime.locale.current.trim());

  if (!shouldTranslate) {
    return { code, title, subTitle };
  }

  const translator = createSiteTranslator({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    siteKey: runtime.site.key,
    locale: runtime.locale.current,
  });
  const sourceTexts = [title ?? "", subTitle ?? ""];
  const translated = await translator.trBulk(sourceTexts, PHI_TR_CTX_WEB_UI_LABEL);

  return {
    code,
    title: translated[0]?.trim() || title,
    subTitle: translated[1]?.trim() || subTitle,
  };
}

export async function PhiResultWidget({ config, runtime }: PhiResultWidgetProps) {
  const { code, title, subTitle } = await resolveResultText({ config, runtime });
  return (
    <PhiResultWidgetBody
      config={config}
      code={code}
      title={title}
      subTitle={subTitle}
    />
  );
}
