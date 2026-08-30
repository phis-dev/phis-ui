import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import { PhiSimpleTextWidget } from "./server";
import {
  PHI_SIMPLE_TEXT_WIDGET_DEFINITION,
  PHI_SIMPLE_TEXT_WIDGET_PLUGIN_TYPE,
  resolvePhiSimpleTextWidgetText,
  type PhiCmsSimpleTextWidgetConfig,
} from "./config";

export const PHI_SIMPLE_TEXT_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsSimpleTextWidgetConfig> = {
  ...PHI_SIMPLE_TEXT_WIDGET_DEFINITION,
  render: ({ widget, config, runtime }) => {
    const noTranslate = hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate);

    return (
      <PhiSimpleTextWidget
        blockId={widget.id}
        key={`widget-${widget.id}`}
        labels={{
          text: resolvePhiSimpleTextWidgetText(
            {
              ...config,
              label: widget.label ?? undefined,
              resolvedContent: widget.resolvedContent ?? null,
            },
            {
              preferSource: noTranslate,
              preferConfigText: config.renderMode === "preview" || config.renderMode === "editor",
            },
            "Text",
          ),
        }}
        config={config}
        runtime={runtime}
      />
    );
  },
  renderPreview: ({ widget, config, runtime }) => (
    <PhiSimpleTextWidget
      blockId={widget.id}
      key={`widget-preview-${widget.id}`}
      labels={{
        text: resolvePhiSimpleTextWidgetText(
          {
            ...config,
            label: widget.label ?? undefined,
            resolvedContent: widget.resolvedContent ?? null,
          },
          {
            preferConfigText: true,
          },
          "Text",
        ),
      }}
      config={{
        ...config,
        renderMode: "preview",
      }}
      runtime={runtime}
    />
  ),
};
export { PHI_SIMPLE_TEXT_WIDGET_PLUGIN_TYPE };
