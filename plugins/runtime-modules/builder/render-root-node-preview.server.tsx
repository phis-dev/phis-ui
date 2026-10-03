import type { CSSProperties, ReactNode } from "react";

import { PhiCmsRegionType } from "../../../constants/phi-cms";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../types/cms-plugins";
import type {
  PhiCmsContentWidgetNode,
  PhiCmsLayoutNode,
  PhiResolvedCmsPageTree,
} from "../../../types/cms";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { PhiCmsLayoutRenderer } from "../../../components/cms/phi-cms-layout-renderer";
import { PhiSlotChildFrame } from "../../../plugins/runtime/phi-slot-child-frame";
import { resolvePhiCmsRegionType } from "../../../helpers/cms-region-keys";
import {
  type PhiBuilderPreviewRegionDraft,
  type PhiBuilderPreviewSnapshot,
} from "./preview-transport";
import { getPhiBuilderRegionDraftKey } from "./region-keys";
import {
  readPhiBuilderRootNodeDraftFields,
  type PhiBuilderRootNodeDraft,
} from "./root-node-normalization";
import { resolvePhiRenderableBlockGeometry } from "../../../types/renderable-block-geometry";
import { resolvePhiRootScaffoldProperties } from "./builder-geometry";
import { buildPhiBuilderRootNodeRenderableTree } from "./root-node-renderable-tree";
import { normalizePhiPaddingWidgetConfig } from "../../../types/cms-config";
import { resolvePhiPaddingStyle } from "../../../components/layouts/phi-layout-contract";

export type PhiBuilderRootNodePreviewInput = PhiBuilderRootNodeDraft;

export type PhiBuilderServerPreviewRegionKey =
  | "header_top"
  | "header_main"
  | "header_bottom"
  | "hero"
  | "sider_left"
  | "sider_right"
  | "content"
  | "footer_top"
  | "footer_main"
  | "footer_bottom";

export type PhiBuilderRootNodeServerPreviewProps = {
  rootNode: PhiBuilderRootNodePreviewInput;
  runtime: PhiBlockRuntime;
  regionType?: number;
  regionKey?: string;
  registry: PhiCmsRuntimeRenderRegistry;
  regionConfig?: Record<string, unknown> | null;
  extraPreviewNodes?: {
    layoutNodes: PhiCmsLayoutNode[];
    contentWidgets: PhiCmsContentWidgetNode[];
  };
};

function buildPreviewTree(
  rootNode: PhiBuilderRootNodePreviewInput,
  regionType: number,
  regionConfig?: Record<string, unknown> | null,
): PhiResolvedCmsPageTree | null {
  return buildPhiBuilderRootNodeRenderableTree({
    rootNode,
    regionType,
    renderMode: "preview",
    regionConfig,
  });
}

export function resolvePhiBuilderPreviewRegionConfig(draft: PhiBuilderPreviewRegionDraft) {
  return {
    ...(draft.regionConfig ?? {}),
    ...(draft.surface == null ? {} : { surface: draft.surface }),
  };
}

function mergePreviewTreeNodes(
  tree: PhiResolvedCmsPageTree,
  extraPreviewNodes?: PhiBuilderRootNodeServerPreviewProps["extraPreviewNodes"],
): PhiResolvedCmsPageTree {
  if (!extraPreviewNodes) {
    return tree;
  }

  const layoutNodesById = new Map<PhiCmsInstanceId, PhiCmsLayoutNode>();
  const contentWidgetsById = new Map<PhiCmsInstanceId, PhiCmsContentWidgetNode>();

  for (const layoutNode of [...extraPreviewNodes.layoutNodes, ...tree.layoutNodes]) {
    layoutNodesById.set(layoutNode.id, layoutNode);
  }
  for (const widget of [...extraPreviewNodes.contentWidgets, ...tree.contentWidgets]) {
    contentWidgetsById.set(widget.id, widget);
  }

  return {
    ...tree,
    layoutNodes: [...layoutNodesById.values()],
    contentWidgets: [...contentWidgetsById.values()],
  };
}

function resolvePreviewRootNodeKind(kind: PhiBuilderPreviewRegionDraft["rootNodeKind"]): "layout" | "widget" | null {
  if (kind === "layout" || kind === "widget") {
    return kind;
  }

  return null;
}

function resolveRootNodeFromPreviewDraft(draft: PhiBuilderPreviewRegionDraft | null | undefined): PhiBuilderRootNodePreviewInput | null {
  if (!draft?.rootNodeTypeKey) {
    return null;
  }

  return {
    id: draft.rootNodeId ?? null,
    typeKey: draft.rootNodeTypeKey,
    kind: resolvePreviewRootNodeKind(draft.rootNodeKind ?? null),
    ...readPhiBuilderRootNodeDraftFields(draft),
  };
}

function buildPreviewSnapshotNodes(snapshot: PhiBuilderPreviewSnapshot | null) {
  const layoutNodes: PhiCmsLayoutNode[] = [];
  const contentWidgets: PhiCmsContentWidgetNode[] = [];

  if (!snapshot) {
    return { layoutNodes, contentWidgets };
  }

  for (const [draftKey, draft] of Object.entries(snapshot.regionDrafts)) {
    const regionKey = draftKey.split(":").at(-1);
    const rootNode = resolveRootNodeFromPreviewDraft(draft);
    if (!rootNode || !regionKey) {
      continue;
    }

    const tree = buildPreviewTree(
      rootNode,
      resolvePhiCmsRegionType(regionKey),
      resolvePhiBuilderPreviewRegionConfig(draft),
    );
    if (!tree) {
      continue;
    }

    layoutNodes.push(...tree.layoutNodes);
    contentWidgets.push(...tree.contentWidgets);
  }

  return { layoutNodes, contentWidgets };
}

export function buildPhiBuilderPreviewRenderableTrees(
  snapshot: PhiBuilderPreviewSnapshot | null,
): PhiResolvedCmsPageTree[] {
  if (!snapshot) {
    return [];
  }

  const extraPreviewNodes = buildPreviewSnapshotNodes(snapshot);
  return Object.values(snapshot.regionDrafts).flatMap((draft) => {
    const rootNode = resolveRootNodeFromPreviewDraft(draft);
    if (!rootNode) {
      return [];
    }
    const tree = buildPreviewTree(
      rootNode,
      PhiCmsRegionType.Content,
      resolvePhiBuilderPreviewRegionConfig(draft),
    );
    return tree ? [mergePreviewTreeNodes(tree, extraPreviewNodes)] : [];
  });
}

export function PhiBuilderRegionServerPreview({
  snapshot,
  draft,
  regionKey,
  runtime,
  registry,
}: {
  snapshot: PhiBuilderPreviewSnapshot | null;
  draft?: PhiBuilderPreviewRegionDraft | null;
  regionKey: string;
  runtime: PhiBlockRuntime;
  registry: PhiCmsRuntimeRenderRegistry;
}) {
  const area = snapshot?.area || "public";
  const pageKey = snapshot?.pageKey ?? null;
  const snapshotDraft = snapshot?.regionDrafts[getPhiBuilderRegionDraftKey(area, regionKey, pageKey)] ?? null;
  const previewDraft = draft ?? snapshotDraft;
  const rootNode = resolveRootNodeFromPreviewDraft(previewDraft);
  const previewRegionConfig = previewDraft
    ? resolvePhiBuilderPreviewRegionConfig(previewDraft)
    : null;
  const extraPreviewNodes = buildPreviewSnapshotNodes(snapshot);

  if (!rootNode) {
    return null;
  }

  return (
    <PhiBuilderRootNodeServerPreview
      rootNode={rootNode}
      runtime={runtime}
      regionKey={regionKey}
      regionType={resolvePhiCmsRegionType(regionKey)}
      registry={registry}
      regionConfig={previewRegionConfig}
      extraPreviewNodes={extraPreviewNodes}
    />
  );
}

export function buildPhiBuilderServerPreviewRegions({
  snapshot,
  runtime,
  registry,
}: {
  snapshot: PhiBuilderPreviewSnapshot | null;
  runtime: PhiBlockRuntime;
  registry: PhiCmsRuntimeRenderRegistry;
}): Partial<Record<PhiBuilderServerPreviewRegionKey, ReactNode>> {
  if (!snapshot) {
    return {};
  }

  const regionKeys: PhiBuilderServerPreviewRegionKey[] = [
    "header_top",
    "header_main",
    "header_bottom",
    "hero",
    "sider_left",
    "sider_right",
    "content",
    "footer_top",
    "footer_main",
    "footer_bottom",
  ];

  return Object.fromEntries(
    regionKeys.map((regionKey) => [
      regionKey,
      <PhiBuilderRegionServerPreview
        key={regionKey}
        snapshot={snapshot}
        regionKey={regionKey}
        runtime={runtime}
        registry={registry}
      />,
    ]),
  );
}

export async function PhiBuilderRootNodeServerPreview({
  rootNode,
  runtime,
  regionType = PhiCmsRegionType.Content,
  registry,
  regionConfig = null,
  extraPreviewNodes,
}: PhiBuilderRootNodeServerPreviewProps): Promise<ReactNode> {
  const rootSlotChildKind = rootNode.kind === "widget" ? "widget" : "layout";
  const rootGeometry = resolvePhiRenderableBlockGeometry(rootNode.rootNodeGeometry);
  const tree = buildPreviewTree(rootNode, regionType, regionConfig);

  if (!tree) {
    return null;
  }

  const previewTree = mergePreviewTreeNodes(tree, extraPreviewNodes);
  const regionPaddingStyle = resolvePhiPaddingStyle(
    normalizePhiPaddingWidgetConfig(regionConfig) ?? {},
  );

  return (
    <div
      data-phi-builder-server-preview-region={
        regionType === PhiCmsRegionType.SiderLeft
          ? "sider_left"
          : regionType === PhiCmsRegionType.SiderRight
            ? "sider_right"
            : undefined
      }
      className="phi-cms-region-shell phi-cms-region-shell--fill"
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <div className="phi-cms-region-shell__content" style={regionPaddingStyle}>
        <PhiSlotChildFrame
          className="phi-builder-root-scaffold__slot"
          kind={rootSlotChildKind}
          blockId={rootNode.id ?? null}
          explicitInlineSize={rootGeometry.explicitInline}
          explicitBlockSize={rootGeometry.explicitBlock}
          style={
            resolvePhiRootScaffoldProperties(rootGeometry) as CSSProperties & Record<`--${string}`, string>
          }
        >
        <PhiCmsLayoutRenderer
          tree={{
            ...previewTree,
            regions: previewTree.regions.map((region) => ({
              ...region,
              regionType,
            })),
          }}
          runtime={runtime}
          regionTypes={[regionType]}
          stackGap={0}
          registry={registry}
        />
        </PhiSlotChildFrame>
      </div>
    </div>
  );
}
