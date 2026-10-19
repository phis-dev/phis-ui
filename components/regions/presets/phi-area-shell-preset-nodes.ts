import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsRegionType } from "../../../constants/phi-cms";
import type { PhiCmsPresetPageNodes } from "../../../helpers/cms-preset-nodes";
import { resolvePhiShellHeaderHeight, resolvePhiShellMetric } from "../../../helpers/shell-region-style";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsContentWidgetNode, PhiCmsLayoutNode, PhiCmsRegionNode } from "../../../types/cms";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { PHI_LAYOUT } from "../../../theme/phi-tokens";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { buildPhiHeaderTopActionsLayoutNode } from "./phi-header-top-actions-layout";

export type PhiAreaShellPresetNodes = {
  regions: PhiCmsRegionNode[];
  layoutNodes: PhiCmsLayoutNode[];
  contentWidgets: PhiCmsContentWidgetNode[];
};

/**
 * The shell an administrative Area carries: one top band with the Tour button at the left, the page title in
 * the middle and the account at the right, and a left Sider with the Area's navigation.
 *
 * The page title had a main band of its own under the top band, which held nothing else; it now stands in
 * the top band's middle, and the band under it is gone.
 *
 * Admin and Editor built this from the same 150 lines with their own ids and labels, and App its Sider a
 * third time; a change to the Sider's collapsing or the header's padding had to be made three times and
 * was made in one. The ids stay the Module's: a node id is derived from Module, preset and node key, so
 * each Module hands in its own map and the tree it gets is its own.
 */
export function buildPhiAreaShellHeaderNodes({
  nodes,
  runtime,
  labelPrefix,
  ids,
}: {
  nodes: PhiCmsPresetPageNodes;
  runtime: PhiBlockRuntime;
  /** The word the Builder shows in front of each node label: "admin", "editor". */
  labelPrefix: string;
  ids: {
    regionHeaderTop: number;
    layoutHeaderTop: PhiCmsInstanceId;
    layoutHeaderTopActions: PhiCmsInstanceId;
    widgetHeaderTopPageTitle: PhiCmsInstanceId;
    widgetHeaderTopTourButton: PhiCmsInstanceId;
    widgetHeaderTopAccount: PhiCmsInstanceId;
  };
}): PhiAreaShellPresetNodes {
  const shell = runtime.site.theme?.shell;
  return {
    regions: [
      nodes.region({
        id: ids.regionHeaderTop,
        regionType: PhiCmsRegionType.HeaderTop,
        rootLayoutNodeId: ids.layoutHeaderTop,
        sortOrder: 10,
        // Structure only: the frame's look is the Theme's (SHELL.md, Shell Chrome Overlay).
        // Sticky: it carries the page title, which stays in view while the content scrolls.
        config: {
          flags: PhiCmsFlags.Sticky,
          size: { height: `${resolvePhiShellHeaderHeight(shell, "top")}px` },
          offsetTop: 0,
        },
      }),
    ],
    layoutNodes: [
      nodes.layout({
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: ids.layoutHeaderTop,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: `${labelPrefix} header top three column`,
        config: {
          balancedSides: true,
          contentAlign: "center",
          paddingLeft: PHI_SPACE.base,
          paddingRight: PHI_SPACE.base,
        },
      }),
      buildPhiHeaderTopActionsLayoutNode(nodes, {
        id: ids.layoutHeaderTopActions,
        parentLayoutNodeId: ids.layoutHeaderTop,
        label: `${labelPrefix} header top actions`,
      }),
    ],
    contentWidgets: [
      /*
       * The Tour button belongs to the Tour Module. With that Module off in this Area the live Shell
       * draws nothing for it, as for any Widget whose Module is not active; on, it shows only on Pages
       * that carry a Tour.
       */
      nodes.widget({
        typeKey: "tour-button",
        id: ids.widgetHeaderTopTourButton,
        parentLayoutNodeId: ids.layoutHeaderTop,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
        sortOrder: 0,
        label: `${labelPrefix} header top tour button`,
        config: {},
      }),
      nodes.widget({
        typeKey: "page-title",
        id: ids.widgetHeaderTopPageTitle,
        parentLayoutNodeId: ids.layoutHeaderTop,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
        sortOrder: 0,
        label: "Page title",
        config: {},
      }),
      nodes.widget({
        typeKey: "account",
        id: ids.widgetHeaderTopAccount,
        parentLayoutNodeId: ids.layoutHeaderTopActions,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[2].slotIndex,
        sortOrder: 20,
        label: `${labelPrefix} header top account`,
        config: {},
      }),
    ],
  };
}

/** The left Sider with the Area's navigation, whose entries come from the navigation behind `navKey`. */
export function buildPhiAreaShellSiderLeftNodes({
  nodes,
  runtime,
  labelPrefix,
  navKey,
  ids,
}: {
  nodes: PhiCmsPresetPageNodes;
  runtime: PhiBlockRuntime;
  labelPrefix: string;
  navKey: string;
  ids: {
    regionSiderLeft: number;
    layoutSiderLeft: PhiCmsInstanceId;
    widgetSiderLeftNav: PhiCmsInstanceId;
  };
}): PhiAreaShellPresetNodes {
  const shell = runtime.site.theme?.shell;
  const shellSiderLeftOffsetTop = resolvePhiShellMetric(shell, "offsetTop", { family: "sider", region: "left" });
  const resolvedShellLeftWidth = resolvePhiShellMetric(shell, "width", { family: "sider", region: "left" }) ?? PHI_LAYOUT.sidebarWidth;
  return {
    regions: [
      nodes.region({
        id: ids.regionSiderLeft,
        regionType: PhiCmsRegionType.SiderLeft,
        rootLayoutNodeId: ids.layoutSiderLeft,
        // Between the header and the content, which is where it is read.
        sortOrder: 25,
        // Structure only: the frame's look is the Theme's (SHELL.md, Shell Chrome Overlay).
        config: {
          flags: PhiCmsFlags.Sticky | PhiCmsFlags.FullHeight | PhiCmsFlags.Collapsible,
          size: { width: `${resolvedShellLeftWidth}px` },
          ...(typeof shellSiderLeftOffsetTop === "number" ? { offsetTop: shellSiderLeftOffsetTop } : { offsetTop: 0 }),
        },
      }),
    ],
    layoutNodes: [
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: ids.layoutSiderLeft,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: `${labelPrefix} sider left stack`,
        config: {
          anchor: {
            horizontal: "center",
            vertical: "top",
          },
          gap: 0,
          padding: PHI_SPACE.xs,
          paddingTop: 0,
        },
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "sidebar-navigation",
        id: ids.widgetSiderLeftNav,
        parentLayoutNodeId: ids.layoutSiderLeft,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: `${labelPrefix} sider left navigation`,
        config: {
          side: "left",
          width: resolvedShellLeftWidth,
          navKey,
        },
      }),
    ],
  };
}

/** Several node groups as one tree body, in the order given. */
export function concatPhiAreaShellPresetNodes(...groups: PhiAreaShellPresetNodes[]): PhiAreaShellPresetNodes {
  return {
    regions: groups.flatMap((group) => group.regions),
    layoutNodes: groups.flatMap((group) => group.layoutNodes),
    contentWidgets: groups.flatMap((group) => group.contentWidgets),
  };
}
