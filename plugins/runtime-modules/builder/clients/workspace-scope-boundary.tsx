"use client";

import type { ReactNode } from "react";

import { PhiBuilderWorkspacePreviewSkeleton } from "../../../../components/widgets/built-in/builder-workspace-preview";
import {
  usePhiDeveloperBuilderStateValue,
} from "../developer-workspace-store";
import type { PhiDeveloperBuilderArea } from "../developer-workspace-types";
import { PhiSignalRuntimePartitionProvider } from "../../../../components/runtime/runtime-signal-partition";
import { PhiBuilderCanvasRegionOverrides } from "./builder-region-overrides";

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
