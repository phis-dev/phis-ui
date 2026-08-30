"use client";

import { useMemo } from "react";

import { PhiTagControl } from "../../../../components/controls/phi-tag-control";
import type { PhiInspectorWidgetLabels } from "../../../../components/widgets/label-types/inspector";
import type { PhiRegionWidgetLabels } from "../../../../components/widgets/label-types/region";
import { getPhiRegionWidgetLabelEntry } from "../../../../components/widgets/label-types/region";
import { usePhiBuilderModuleMetas } from "../plugin-meta-store";
import {
  findPhiBuilderLayoutNodeById,
  findPhiBuilderWidgetNodeByIdInLayouts,
  findPhiBuilderWidgetNodeByIdInWidgets,
} from "../node-finders";
import { resolveRegionDraftKey } from "../developer-region-drafts";
import {
  usePhiDeveloperBuilderStateValue,
  usePhiDeveloperRegionDrafts,
} from "../developer-workspace-store";

export function PhiBuilderInspectorTitleWidgetClient({
  inspectorLabels,
  regionLabels,
}: {
  inspectorLabels: PhiInspectorWidgetLabels;
  regionLabels: PhiRegionWidgetLabels;
}) {
  const area = usePhiDeveloperBuilderStateValue("public", (state) => state.area);
  const pageKey = usePhiDeveloperBuilderStateValue("public", (state) => state.pageKey);
  const nodeId = usePhiDeveloperBuilderStateValue("public", (state) => state.nodeId);
  const nodeKey = usePhiDeveloperBuilderStateValue("public", (state) => state.nodeKey);
  const nodeKind = usePhiDeveloperBuilderStateValue("public", (state) => state.nodeKind);
  const selectedRootRegionKey = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.selectedRootRegionKey,
  );
  const regionDrafts = usePhiDeveloperRegionDrafts();
  const plugins = usePhiBuilderModuleMetas(area).plugins;

  const title = useMemo(() => {
    if (nodeKind === "region") {
      const regionKey = nodeKey.replace(/^region:/, "");
      return {
        kind: inspectorLabels.region,
        color: "blue",
        name: getPhiRegionWidgetLabelEntry(regionKey, regionLabels)?.title ?? regionKey,
        origin: regionKey,
      };
    }

    if (nodeKind !== "layout" && nodeKind !== "widget") return null;
    const plugin = plugins.find((candidate) =>
      candidate.kind === nodeKind &&
      (candidate.typeKey === nodeKey || `${candidate.pluginKey}/${candidate.typeKey}` === nodeKey)
    );
    const rootDraft = selectedRootRegionKey
      ? resolveRegionDraftKey(regionDrafts, area, selectedRootRegionKey, pageKey)
      : null;
    const nestedLayout = nodeKind === "layout" && rootDraft && nodeId != null
      ? findPhiBuilderLayoutNodeById(rootDraft.rootNodeChildLayouts ?? [], nodeId)
      : null;
    const widget = nodeKind === "widget" && rootDraft && nodeId != null
      ? findPhiBuilderWidgetNodeByIdInWidgets(rootDraft.rootNodeChildWidgets ?? [], nodeId) ??
        findPhiBuilderWidgetNodeByIdInLayouts(rootDraft.rootNodeChildLayouts ?? [], nodeId)
      : null;
    const fallback = nodeKind === "layout" ? inspectorLabels.layout : inspectorLabels.widget;
    return {
      kind: fallback,
      color: nodeKind === "layout" ? "green" : "orange",
      name: plugin?.title ?? nestedLayout?.label ?? widget?.label ??
        (nodeKind === "layout" ? rootDraft?.rootNodeTitle : null) ?? fallback,
      origin: plugin ? `${plugin.pluginKey}/${plugin.typeKey}` : nodeKey,
    };
  }, [area, inspectorLabels, nodeId, nodeKey, nodeKind, pageKey, plugins, regionDrafts, regionLabels, selectedRootRegionKey]);

  if (!title) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <PhiTagControl color={title.color}>{title.kind}</PhiTagControl>
      <span
        title={title.origin}
        style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}
      >
        {title.name}
      </span>
    </div>
  );
}
