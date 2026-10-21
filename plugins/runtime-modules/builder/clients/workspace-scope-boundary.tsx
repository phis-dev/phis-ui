"use client";

import type { ReactNode } from "react";

import { PhiBuilderWorkspacePreviewSkeleton } from "../../../../components/widgets/built-in/builder-workspace-preview";
import {
  usePhiDeveloperBuilderStateValue,
} from "../developer-workspace-store";
import type { PhiDeveloperBuilderArea } from "../developer-workspace-types";
import { PhiSignalRuntimePartitionProvider } from "../../../../components/runtime/runtime-signal-partition";
import { PhiBuilderCanvasRegionOverrides } from "./builder-region-overrides";
import { usePhiSignalIdentity } from "../../../../components/runtime/runtime-signal-identity";
import { usePhiVisualAnchorParts } from "../../../../components/runtime/runtime-visual-anchors";
import type { PhiVisualAnchorAddress } from "../../../../types/visual-anchors";
import { PHI_BUILDER_PAGE_REGION_KEYS, PHI_BUILDER_SHELL_REGION_KEYS } from "../region-keys";

export function PhiBuilderWorkspaceScopeBoundary({
  kind,
  targetArea,
  targetPageKey,
  children,
}: {
  kind: "pages" | "shells";
  targetArea: PhiDeveloperBuilderArea;
  targetPageKey?: string | null;
  children: ReactNode;
}) {
  const activeArea = usePhiDeveloperBuilderStateValue("public", (state) => state.area);
  const activePageKey = usePhiDeveloperBuilderStateValue("public", (state) => state.pageKey);
  const scopeMatches =
    activeArea === targetArea &&
    (targetPageKey == null || activePageKey === targetPageKey);
  /*
   * Each Region on the canvas, offered to a Tour as `cms:<workspace>:<regionKey>`. Registered here, on
   * this side of the canvas partition: the Tour looks in the Page's partition, and the canvas below runs
   * in an isolated one of its own.
   */
  const signalIdentity = usePhiSignalIdentity();
  usePhiVisualAnchorParts(
    signalIdentity.receiver?.startsWith("cms:") ? signalIdentity.receiver as PhiVisualAnchorAddress : null,
    kind === "shells" ? PHI_BUILDER_SHELL_REGION_KEYS : PHI_BUILDER_PAGE_REGION_KEYS,
  );

  return scopeMatches ? (
    <PhiSignalRuntimePartitionProvider
      id={`canvas:${kind}:${targetArea}:${targetPageKey ?? "area"}`}
      kind="canvas"
      context={{ area: targetArea, pageKey: targetPageKey ?? null }}
      isolated
    >
      <PhiBuilderCanvasRegionOverrides>
        {children}
      </PhiBuilderCanvasRegionOverrides>
    </PhiSignalRuntimePartitionProvider>
  ) : <PhiBuilderWorkspacePreviewSkeleton kind={kind} />;
}
