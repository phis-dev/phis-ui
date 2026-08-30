import { PHI_LAYOUT } from "../../../theme/phi-tokens";
import type { PhiCmsBackgroundWidgetConfig } from "../../../components/widgets/config/background";
import type { PhiDeveloperBuilderRegionDraft } from "./developer-workspace-types";

function createDefaultRegionBackground(): PhiCmsBackgroundWidgetConfig {
  return {
    base: {
      kind: "none",
    },
    overlay: null,
    effect: null,
  };
}

export function getPhiBuilderDefaultRegionDraft(regionKey: string | null): PhiDeveloperBuilderRegionDraft {
  const background = createDefaultRegionBackground();

  switch (regionKey) {
    case "header_top":
      return {
        sticky: true,
        offsetTop: 0,
        size: {
          height: 34,
        },
        zIndex: 210,
        background,
        border: null,
        shadow: null,
        rootNodeShadow: null,
      };
    case "header_main":
      return {
        sticky: true,
        offsetTop: 0,
        size: {
          height: PHI_LAYOUT.headerHeight,
        },
        zIndex: 200,
        background,
        border: null,
        shadow: null,
        rootNodeShadow: null,
      };
    case "header_bottom":
      return {
        sticky: true,
        offsetTop: 0,
        size: undefined,
        zIndex: 220,
        background,
        border: null,
        shadow: null,
        rootNodeShadow: null,
      };
    case "sider_left":
      return {
        sticky: true,
        offsetTop: 0,
        size: {
          width: PHI_LAYOUT.sidebarWidth,
        },
        zIndex: 300,
        background,
        border: null,
        shadow: null,
        rootNodeShadow: null,
      };
    case "sider_right":
      return {
        sticky: true,
        offsetTop: 0,
        size: {
          width: PHI_LAYOUT.sidebarWidth,
        },
        zIndex: 100,
        background,
        border: null,
        shadow: null,
        rootNodeShadow: null,
      };
    case "footer_top":
      return {
        sticky: false,
        offsetTop: 0,
        size: undefined,
        zIndex: 220,
        background,
        border: null,
        shadow: null,
        rootNodeShadow: null,
      };
    case "footer_main":
      return {
        sticky: false,
        offsetTop: 0,
        size: undefined,
        zIndex: 200,
        background,
        border: null,
        shadow: null,
        rootNodeShadow: null,
      };
    case "footer_bottom":
      return {
        sticky: false,
        offsetTop: 0,
        size: undefined,
        zIndex: 210,
        background,
        border: null,
        shadow: null,
        rootNodeShadow: null,
      };
    default:
      return {
        sticky: false,
        offsetTop: 0,
        size: undefined,
        zIndex: 0,
        background,
        border: null,
        shadow: null,
        rootNodeShadow: null,
      };
  }
}
