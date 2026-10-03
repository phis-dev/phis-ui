import { PHI_LAYOUT } from "../../../theme/phi-tokens";
import type { PhiDeveloperBuilderRegionDraft } from "./developer-workspace-types";

export function getPhiBuilderDefaultRegionDraft(regionKey: string | null): PhiDeveloperBuilderRegionDraft {
  switch (regionKey) {
    case "header_top":
      return {
        sticky: true,
        offsetTop: 0,
        size: {
          height: 34,
        },
        zIndex: 210,
        surface: null,
        rootNodeSurface: null,
      };
    case "header_main":
      return {
        sticky: true,
        offsetTop: 0,
        size: {
          height: PHI_LAYOUT.headerHeight,
        },
        zIndex: 200,
        surface: null,
        rootNodeSurface: null,
      };
    case "header_bottom":
      return {
        sticky: true,
        offsetTop: 0,
        size: undefined,
        zIndex: 220,
        surface: null,
        rootNodeSurface: null,
      };
    case "sider_left":
      return {
        sticky: true,
        offsetTop: 0,
        size: {
          width: PHI_LAYOUT.sidebarWidth,
        },
        zIndex: 300,
        surface: null,
        rootNodeSurface: null,
      };
    case "sider_right":
      return {
        sticky: true,
        offsetTop: 0,
        size: {
          width: PHI_LAYOUT.sidebarWidth,
        },
        zIndex: 100,
        surface: null,
        rootNodeSurface: null,
      };
    case "footer_top":
      return {
        sticky: false,
        offsetTop: 0,
        size: undefined,
        zIndex: 220,
        surface: null,
        rootNodeSurface: null,
      };
    case "footer_main":
      return {
        sticky: false,
        offsetTop: 0,
        size: undefined,
        zIndex: 200,
        surface: null,
        rootNodeSurface: null,
      };
    case "footer_bottom":
      return {
        sticky: false,
        offsetTop: 0,
        size: undefined,
        zIndex: 210,
        surface: null,
        rootNodeSurface: null,
      };
    default:
      return {
        sticky: false,
        offsetTop: 0,
        size: undefined,
        zIndex: 0,
        surface: null,
        rootNodeSurface: null,
      };
  }
}
