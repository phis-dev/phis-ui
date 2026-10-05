import { PhiCmsFlags, PhiCmsRegionType } from "../../../constants/phi-cms";
import { readPhiFlags } from "../../../helpers/flags";
import { getDefaultRegionDraft, resolveRegionDraftKey } from "./developer-region-drafts";
import { getPhiBuilderRegionDraftKey } from "./region-keys";
import {
  getPhiDeveloperRegionDraftsSnapshot,
  setPhiDeveloperRegionDraft,
} from "./developer-workspace-store";
import type { PhiDeveloperBuilderArea, PhiDeveloperBuilderRegionDraft } from "./developer-workspace-types";
import { createPhiBuilderHistoryContext } from "./history";

export function getBuilderRegionKey(regionType: number) {
  switch (regionType) {
    case PhiCmsRegionType.HeaderTop:
      return "header_top";
    case PhiCmsRegionType.HeaderMain:
      return "header_main";
    case PhiCmsRegionType.HeaderBottom:
      return "header_bottom";
    case PhiCmsRegionType.Hero:
      return "hero";
    case PhiCmsRegionType.SiderLeft:
      return "sider_left";
    case PhiCmsRegionType.SiderRight:
      return "sider_right";
    case PhiCmsRegionType.FooterTop:
      return "footer_top";
    case PhiCmsRegionType.Footer:
      return "footer_main";
    case PhiCmsRegionType.FooterBottom:
      return "footer_bottom";
    case PhiCmsRegionType.Content:
      return "content";
    default:
      return `region_${regionType}`;
  }
}

export function applyPhiDeveloperBuilderSiderLeftMode(
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  mode: "fullHeight" | "content",
) {
  const checked = mode === "fullHeight";
  const draftKey = getPhiBuilderRegionDraftKey(area, "sider_left", pageKey);
  const regionDrafts = getPhiDeveloperRegionDraftsSnapshot();
  const currentDraft =
    resolveRegionDraftKey(regionDrafts, area, "sider_left", pageKey) ??
    getDefaultRegionDraft("sider_left");
  const currentFlags = readPhiFlags(currentDraft.regionConfig?.flags);
  const nextRegionConfig = {
    ...(currentDraft.regionConfig ?? {}),
    flags: checked
      ? currentFlags | PhiCmsFlags.FullHeight
      : currentFlags & ~PhiCmsFlags.FullHeight,
  } as NonNullable<PhiDeveloperBuilderRegionDraft["regionConfig"]>;

  delete nextRegionConfig.height;

  const nextZIndex =
    currentDraft.zIndex == null || currentDraft.zIndex === 300 || currentDraft.zIndex === 100
      ? (checked ? 300 : 100)
      : currentDraft.zIndex;
  const nextSize =
    checked && currentDraft.size?.height != null
      ? { ...currentDraft.size, height: undefined }
      : currentDraft.size;
  const nextMinSize =
    checked && currentDraft.minSize?.height != null
      ? { ...currentDraft.minSize, height: undefined }
      : currentDraft.minSize;
  const nextMaxSize =
    checked && currentDraft.maxSize?.height != null
      ? { ...currentDraft.maxSize, height: undefined }
      : currentDraft.maxSize;

  setPhiDeveloperRegionDraft(
    draftKey,
    {
      ...currentDraft,
      sticky: checked,
      zIndex: nextZIndex,
      size: nextSize,
      minSize: nextMinSize,
      maxSize: nextMaxSize,
      regionConfig: nextRegionConfig,
    },
    {
      historyContext: createPhiBuilderHistoryContext({
        workspace: "structure",
        area,
      }),
      historyLabel: "Change shell layout",
    },
  );
}
