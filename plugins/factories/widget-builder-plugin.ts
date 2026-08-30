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
  const { contentBinding: _contentBinding, ...builderDefinition } = definition;
  void _contentBinding;

  return {
    ...builderDefinition,
    renderEditor,
  };
}
