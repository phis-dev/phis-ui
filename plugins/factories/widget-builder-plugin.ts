"use client";

import type { ReactNode } from "react";

import type {
  PhiCmsBuilderWidgetPlugin,
  PhiCmsWidgetPluginRenderArgs,
} from "../../types";
import type { PhiCmsWidgetPluginDefinition } from "../../types/builder";

export function createPhiCmsBuilderWidgetPlugin<TConfig>(
  definition: PhiCmsWidgetPluginDefinition<TConfig>,
  renderEditor: (args: PhiCmsWidgetPluginRenderArgs<TConfig>) => ReactNode,
): PhiCmsBuilderWidgetPlugin<TConfig> {
  // The definition whole: the Builder plugin is the declaration plus its editor, nothing taken away.
  return {
    ...definition,
    renderEditor,
  };
}
