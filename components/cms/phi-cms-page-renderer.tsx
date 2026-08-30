import { PhiCmsRegionType } from "../../constants/phi-cms";
import type { PhiResolvedCmsRenderableTree } from "../../types/cms";
import type { PhiBlockRuntime } from "../../types";
import type { PhiResolvedRuntimeRenderRegistry } from "../../plugins/runtime-modules/contracts";
import {
  PhiCmsLayoutRenderer,
  PhiCmsOverlayRenderer,
  type PhiCmsLayoutRendererProps,
} from "./phi-cms-layout-renderer";

export type PhiCmsPageRendererProps = {
  tree: PhiResolvedCmsRenderableTree;
  runtime: PhiBlockRuntime;
  stackGap?: PhiCmsLayoutRendererProps["stackGap"];
  registry: PhiResolvedRuntimeRenderRegistry;
};

export async function PhiCmsPageRenderer({
  tree,
  runtime,
  stackGap = 0,
  registry,
}: PhiCmsPageRendererProps) {
  const contentRegionBlock = (
    <PhiCmsLayoutRenderer
      tree={tree}
      runtime={runtime}
      regionClassName="phi-cms-region-shell--fill"
      regionTypes={[PhiCmsRegionType.Content]}
      stackGap={stackGap}
      registry={registry}
    />
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        minWidth: 0,
        gap: stackGap,
      }}
    >
      {contentRegionBlock}
      <PhiCmsOverlayRenderer
        tree={tree}
        runtime={runtime}
        registry={registry}
        signalScope="page"
      />
    </div>
  );
}
