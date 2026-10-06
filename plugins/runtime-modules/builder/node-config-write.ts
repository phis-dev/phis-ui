import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiSignalAddress, PhiSignalScope } from "../../../types/signals";
import type { PhiHistoryActionKey } from "../../../components/widgets/label-types/history";
import { assertPhiCmsConfigFields } from "../../../helpers/cms-config-field-validation";
import { resolvePhiWidgetSignalSubcontrolAddresses } from "../../../components/widgets/signals/signal-endpoints";
import { getPhiBuilderModuleMetasSnapshot } from "./plugin-meta-store";
import {
  getPhiDeveloperRegionDraftsSnapshot,
  setPhiDeveloperRegionDraft,
  setPhiDeveloperRegionDraftAndPruneSignalRoutes,
} from "./developer-workspace-store";
import { createPhiBuilderRegionHistoryContext } from "./history";
import { isPhiBuilderPageScopedRegion } from "./region-keys";
import type { PhiDeveloperBuilderArea, PhiDeveloperBuilderRegionDraft } from "./developer-workspace-types";

/*
 * The one way a node in a Region draft is changed in place.
 *
 * The Canvas and the Inspector each had their own: the Inspector checked the config against the
 * fields the node declares but left the routes to subcontrols the edit removed standing, the Canvas
 * removed those routes but wrote whatever it was handed, and each walked the tree with a walker of its
 * own -- one replacing a Layout's config, one merging a Widget's. Both now come here, so a config
 * written from either side is checked, and an edit that takes a subcontrol away takes its routes too.
 */

type PhiBuilderTreeNode = PhiCmsLayoutRenderNode | PhiCmsContentWidgetNode;

function isWidgetNode(node: PhiBuilderTreeNode): node is PhiCmsContentWidgetNode {
  return "contentId" in node;
}

/** The node with `nodeId` in a Region's tree, root included, whichever kind it is. */
export function findPhiBuilderTreeNode(
  rootNode: PhiCmsLayoutRenderNode,
  nodeId: PhiCmsInstanceId,
): PhiBuilderTreeNode | null {
  if (rootNode.id === nodeId) return rootNode;
  const widget = (rootNode.childWidgets ?? []).find((child) => child.id === nodeId);
  if (widget) return widget;
  for (const layout of rootNode.childLayouts ?? []) {
    const found = findPhiBuilderTreeNode(layout, nodeId);
    if (found) return found;
  }
  return null;
}

/** The tree with the node `nodeId` replaced by what `patch` makes of it; untouched branches are kept. */
export function patchPhiBuilderTreeNode(
  rootNode: PhiCmsLayoutRenderNode,
  nodeId: PhiCmsInstanceId,
  patch: (node: PhiBuilderTreeNode) => PhiBuilderTreeNode,
): PhiCmsLayoutRenderNode {
  if (rootNode.id === nodeId) {
    return patch(rootNode) as PhiCmsLayoutRenderNode;
  }
  let changed = false;
  const childWidgets = (rootNode.childWidgets ?? []).map((child) => {
    if (child.id !== nodeId) return child;
    changed = true;
    return patch(child) as PhiCmsContentWidgetNode;
  });
  const childLayouts = (rootNode.childLayouts ?? []).map((child) => {
    const next = patchPhiBuilderTreeNode(child, nodeId, patch);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? { ...rootNode, childLayouts, childWidgets } : rootNode;
}

const PADDING_KEYS = new Set(["padding", "gap", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]);
const GEOMETRY_KEYS = new Set(["size", "minSize", "maxSize", "zIndex", "viewportFlags"]);

/**
 * The kind of step a config edit was, read off the keys it changed. An edit that changed keys of more
 * than one kind is a change of the node's settings.
 */
export function resolvePhiBuilderConfigEditAction(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): PhiHistoryActionKey {
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null));
  const kinds = new Set(changed.map((key): PhiHistoryActionKey =>
    key === "effects" ? "changeNodeEffects"
      : key === "surface" ? "changeNodeSurface"
        : key === "anchor" ? "changeNodeAnchor"
          : key === "signalRoutes" ? "changeNodeSignals"
            : key === "slotTitles" ? "renameSlot"
              : PADDING_KEYS.has(key) ? "changeNodePadding"
                : GEOMETRY_KEYS.has(key) ? "resizeNode"
                  : "changeNodeSettings"));
  return kinds.size === 1 ? [...kinds][0]! : "changeNodeSettings";
}

/** What a node is called in a history step: its own label, else what its type is called. */
export function resolvePhiBuilderNodeHistorySubject(area: PhiDeveloperBuilderArea, node: PhiBuilderTreeNode) {
  const label = node.label?.trim();
  if (label) return label;
  const meta = getPhiBuilderModuleMetasSnapshot(area).plugins
    .find((candidate) => `${candidate.pluginKey}/${candidate.typeKey}` === node.widgetType);
  return meta?.title ?? node.widgetType;
}

/**
 * Writes one node of a Region draft: the config `patchConfig` makes of the node's config, or -- for an
 * edit that is not a config, such as the translation flag -- the node `patchNode` makes of it.
 *
 * The result is checked against the fields the node's type declares. For a Widget, the subcontrols the
 * new config no longer has take their signal routes with them, in the same step. The step is recorded
 * in the Region's history as `actionKey`, or as the kind the changed keys say it was.
 *
 * Answers `false` when the draft or the node is not there, so the caller can tell a no-op from a write.
 */
export function writePhiBuilderNode({
  area,
  pageKey,
  regionKey,
  draftKey,
  baseDraft,
  nodeId,
  patchConfig,
  patchNode,
  actionKey,
  coalesceKey,
}: {
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  regionKey: string;
  draftKey: string;
  /** The draft as it stands; read from the store when not given. */
  baseDraft?: PhiDeveloperBuilderRegionDraft | null;
  nodeId: PhiCmsInstanceId;
  patchConfig?: (config: Record<string, unknown>) => Record<string, unknown>;
  patchNode?: <TNode extends PhiBuilderTreeNode>(node: TNode) => TNode;
  actionKey?: PhiHistoryActionKey;
  coalesceKey?: string;
}): boolean {
  const draft = baseDraft ?? getPhiDeveloperRegionDraftsSnapshot()[draftKey] ?? null;
  const rootNode = draft?.rootNode ?? null;
  const node = rootNode ? findPhiBuilderTreeNode(rootNode, nodeId) : null;
  if (!draft || !rootNode || !node) {
    return false;
  }

  const currentConfig = node.config ?? {};
  const nextConfig = patchConfig ? patchConfig(currentConfig) : currentConfig;
  const meta = getPhiBuilderModuleMetasSnapshot(area).plugins
    .find((candidate) => `${candidate.pluginKey}/${candidate.typeKey}` === node.widgetType);
  /*
   * A type with no metadata in the active Canvas is left alone rather than refused: the catalogue is
   * per Area, and a node from elsewhere is a question about scope, not about this value.
   */
  if (meta?.fields) {
    assertPhiCmsConfigFields(meta.fields, nextConfig, meta.title ?? node.widgetType);
  }
  const patchedNode = patchNode ? patchNode({ ...node, config: nextConfig }) : { ...node, config: nextConfig };
  const nextDraft = { ...draft, rootNode: patchPhiBuilderTreeNode(rootNode, nodeId, () => patchedNode) };

  const pageScoped = isPhiBuilderPageScopedRegion(regionKey);
  const history = {
    context: createPhiBuilderRegionHistoryContext({ area, pageKey, pageScoped }),
    action: {
      key: actionKey ?? resolvePhiBuilderConfigEditAction(currentConfig, nextConfig),
      subject: resolvePhiBuilderNodeHistorySubject(area, node),
    },
    ...(coalesceKey ? { coalesceKey } : {}),
  };

  const signalSubcontrols = isWidgetNode(node) && meta?.kind === "widget" ? meta.signalSubcontrols : null;
  const keptSubcontrols = new Set<PhiSignalAddress>(signalSubcontrols
    ? resolvePhiWidgetSignalSubcontrolAddresses({ blockId: node.id, config: nextConfig, signalSubcontrols })
    : []);
  const removedSubcontrols = signalSubcontrols
    ? resolvePhiWidgetSignalSubcontrolAddresses({ blockId: node.id, config: currentConfig, signalSubcontrols })
      .filter((address) => !keptSubcontrols.has(address))
    : [];

  if (removedSubcontrols.length > 0) {
    const scope: PhiSignalScope = pageScoped ? "page" : "area";
    setPhiDeveloperRegionDraftAndPruneSignalRoutes({
      draftKey,
      draft: nextDraft,
      area,
      pageKey,
      targets: removedSubcontrols.map((address) => ({ address, scope })),
      history,
    });
  } else {
    setPhiDeveloperRegionDraft(draftKey, nextDraft, { history });
  }
  return true;
}
