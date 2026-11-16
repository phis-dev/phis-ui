import { trWidgetText } from "../../../../../server-helpers/translate";
import { PHI_TEXT_SOURCE_PRESET } from "../../../../../helpers/text-source";
import type { PhiBlockRuntime } from "../../../../../types";
import { PHI_RESULT_HOME_LINK_SOURCE_LABEL, type PhiCmsResultWidgetConfig } from "./config";
import { localizeAreaPath } from "../../../../../helpers/locale";
import { PhiResultWidgetBody } from "../../../../../components/widgets/shared/result-body";

export type PhiResultWidgetProps = {
  /** Its own words arrive translated (server-helpers/cms-widget-texts.ts). */
  config?: PhiCmsResultWidgetConfig;
  runtime: PhiBlockRuntime;
};

/**
 * The home link's label where nobody wrote one: the Widget's own sentence, so the platform's whoever
 * placed the Widget, and translated from the global store.
 */
async function resolveResultHomeLinkLabel(config: PhiCmsResultWidgetConfig | undefined, runtime: PhiBlockRuntime) {
  const authored = config?.homeLinkLabel?.trim();
  if (authored) return authored;
  const translated = await trWidgetText(runtime.locale.current, PHI_RESULT_HOME_LINK_SOURCE_LABEL, PHI_TEXT_SOURCE_PRESET);
  return translated.trim() || PHI_RESULT_HOME_LINK_SOURCE_LABEL;
}

export async function PhiResultWidget({ config, runtime }: PhiResultWidgetProps) {
  const code = config?.code?.trim();
  const title = config?.title?.trim();
  const subTitle = config?.subTitle?.trim();
  const homeLinkLabel = await resolveResultHomeLinkLabel(config, runtime);
  /*
   * Resolved here rather than configured: the root of the Area this result was rendered in, in the
   * locale it was rendered for. `localizeAreaPath` is the same answer the navigation gives.
   */
  const homeHref = config?.homeLink
    ? localizeAreaPath(runtime.locale.current, config.homeLinkTarget === "site" ? "public" : runtime.area, "/")
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
