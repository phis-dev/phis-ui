import {
  trGlobal,
  trGlobalForLocale,
} from "../../../../../server-helpers/translate";
import type { PhiCmsInstanceId, PhiRenderableBlockBase, PhiServerBlockBaseProps } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiSimpleTextWidgetClientConfig } from "./client";

export type PhiSimpleTextWidgetLabels = {
  text: string;
};

export type PhiSimpleTextWidgetConfig = PhiSimpleTextWidgetClientConfig &
  PhiRenderableBlockBase;

export type PhiSimpleTextWidgetProps = PhiServerBlockBaseProps<
  PhiSimpleTextWidgetLabels,
  PhiSimpleTextWidgetConfig
> & {
  blockId: PhiCmsInstanceId;
  /**
   * Whether the text still has to be translated, which is true only where it is the Widget's own.
   *
   * Text that came from a Content record arrives translated already -- the record carries the source
   * and the value, and the resolver has picked one. Text written into the config has no record behind
   * it, which is the case for every sentence a Preset brings, and it went out in the language it was
   * written in while the Description and Card Widgets beside it were translating theirs.
   */
  translate?: boolean;
};

export async function PhiSimpleTextWidget({
  blockId,
  labels,
  config,
  translate,
  runtime,
}: PhiSimpleTextWidgetProps) {
  const locale = runtime?.locale.current;
  const text = translate && labels.text
    ? locale ? await trGlobalForLocale(locale, labels.text) : await trGlobal(labels.text)
    : labels.text;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.SimpleText}
      componentProps={{
        blockId,
        labels: { text },
        config: config satisfies PhiSimpleTextWidgetClientConfig | undefined,
      }}
    />
  );
}
