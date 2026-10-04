"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsCardWidgetConfig } from "./config";
import { PhiCardWidgetEditor } from "./editor";
import { PhiWidgetImageToolButton } from "../../../../../components/widgets/client/shared/phi-widget-image-tool-button";
import { PHI_CARD_WIDGET_DEFINITION } from "./config";

export const PHI_CARD_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsCardWidgetConfig> = {
  ...PHI_CARD_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiCardWidgetEditor config={config} title={widget.label ?? undefined} />
  ),
  renderEditorTools: ({ widget, authoring }) => authoring?.updateConfig ? (
    <PhiWidgetImageToolButton
      blockId={widget.id}
      // A card shows a foreign picture plainly and never vouches for one, so it keeps no `trusted`.
      onChange={(patch) => {
        const next: Record<string, unknown> = { ...patch };
        delete next.trusted;
        authoring.updateConfig?.(next as Partial<PhiCmsCardWidgetConfig>);
      }}
    />
  ) : null,
};
