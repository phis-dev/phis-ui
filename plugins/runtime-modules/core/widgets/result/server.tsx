import { trWidgetText } from "../../../../../server-helpers/translate";
import { PHI_TEXT_SOURCE_PRESET } from "../../../../../helpers/text-source";
import type { PhiBlockRuntime } from "../../../../../types";
import { PHI_RESULT_HOME_LINK_SOURCE_LABEL, type PhiCmsResultWidgetConfig } from "./config";
import { localizeAreaPath } from "../../../../../helpers/locale";
import { PhiResultWidgetBody } from "../../../../../components/widgets/shared/result-body";

export type PhiResultWidgetProps = {
  config?: PhiCmsResultWidgetConfig;
  runtime: PhiBlockRuntime;
  /** Whether the Widget's own text is translated, which the node's `NoTranslate` flag turns off. */
  translate: boolean;
};

/**
 * The Result's words, each from the store of whoever wrote it (`helpers/text-source.ts`).
 *
 * A Preset's title and subtitle -- the error pages' "Not found" -- are the platform's and come from the
 * global store; an author's are the Site's. The home link's default label is the Widget's own sentence,
 * so it is the platform's whoever placed the Widget.
 */
async function resolveResultText({ config, runtime, translate }: PhiResultWidgetProps) {
  const code = config?.code?.trim();
  const title = config?.title?.trim();
  const subTitle = config?.subTitle?.trim();
  const authoredHomeLinkLabel = config?.homeLinkLabel?.trim();
  const homeLinkLabel = authoredHomeLinkLabel || PHI_RESULT_HOME_LINK_SOURCE_LABEL;
  const shouldTranslate =
    translate &&
    config?.renderMode !== "preview" &&
    config?.renderMode !== "editor";

  if (!shouldTranslate) {
    return { code, title, subTitle, homeLinkLabel };
  }

  const locale = runtime.locale.current;
  const textSource = config?.textSource;
  const translateText = async (value: string | undefined) =>
    value ? (await trWidgetText(locale, value, textSource)).trim() || value : value;
  const [translatedTitle, translatedSubTitle, translatedHomeLinkLabel] = await Promise.all([
    translateText(title),
    translateText(subTitle),
    authoredHomeLinkLabel
      ? translateText(authoredHomeLinkLabel)
      : trWidgetText(locale, PHI_RESULT_HOME_LINK_SOURCE_LABEL, PHI_TEXT_SOURCE_PRESET),
  ]);

  return {
    code,
    title: translatedTitle,
    subTitle: translatedSubTitle,
    homeLinkLabel: translatedHomeLinkLabel?.trim() || homeLinkLabel,
  };
}

export async function PhiResultWidget({ config, runtime, translate }: PhiResultWidgetProps) {
  const { code, title, subTitle, homeLinkLabel } = await resolveResultText({ config, runtime, translate });
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
