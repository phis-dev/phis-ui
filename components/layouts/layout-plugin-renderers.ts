import type { ReactNode } from "react";

import type { PhiCmsLayoutPluginRenderArgs } from "../../types";

type PhiLayoutStructuralRenderMode = "live" | "editor";

export function definePhiLayoutRenderers<TConfig>(
  renderer: (
    args: PhiCmsLayoutPluginRenderArgs<TConfig>,
    renderMode: PhiLayoutStructuralRenderMode,
  ) => ReactNode,
) {
  return {
    render: (args: PhiCmsLayoutPluginRenderArgs<TConfig>) => renderer(args, "live"),
    renderEditor: (args: PhiCmsLayoutPluginRenderArgs<TConfig>) => renderer(args, "editor"),
  };
}
