import { PhiCmsRegionType } from "../constants/phi-cms";

export const PHI_CMS_REGION_TYPE_BY_KEY = {
  header_top: PhiCmsRegionType.HeaderTop,
  header_main: PhiCmsRegionType.HeaderMain,
  header_bottom: PhiCmsRegionType.HeaderBottom,
  hero: PhiCmsRegionType.Hero,
  sider_left: PhiCmsRegionType.SiderLeft,
  sider_right: PhiCmsRegionType.SiderRight,
  content: PhiCmsRegionType.Content,
  footer_top: PhiCmsRegionType.FooterTop,
  footer_main: PhiCmsRegionType.Footer,
  footer_bottom: PhiCmsRegionType.FooterBottom,
  drawer_right: PhiCmsRegionType.Drawer,
} as const;

export type PhiCmsRegionKey = keyof typeof PHI_CMS_REGION_TYPE_BY_KEY;

export const PHI_CMS_SHELL_OWNED_REGION_KEYS = [
  "header_top",
  "header_main",
  "sider_left",
  "footer_main",
  "footer_bottom",
] as const satisfies readonly PhiCmsRegionKey[];

export const PHI_CMS_PAGE_OWNED_REGION_KEYS = [
  "header_bottom",
  "hero",
  "content",
  "sider_right",
  "footer_top",
  "drawer_right",
] as const satisfies readonly PhiCmsRegionKey[];

export function isPhiCmsShellOwnedRegion(regionKey: string): regionKey is (typeof PHI_CMS_SHELL_OWNED_REGION_KEYS)[number] {
  return (PHI_CMS_SHELL_OWNED_REGION_KEYS as readonly string[]).includes(regionKey);
}

export function isPhiCmsPageOwnedRegion(regionKey: string): regionKey is (typeof PHI_CMS_PAGE_OWNED_REGION_KEYS)[number] {
  return (PHI_CMS_PAGE_OWNED_REGION_KEYS as readonly string[]).includes(regionKey);
}

/**
 * Which of the two a Region is, as one value rather than two questions.
 *
 * A shell-owned Region belongs to the Area and outlives a move between its Pages; a page-owned one is
 * built again for the Page being opened. That difference is what a Widget means when it says where it
 * can stand: navigation that rebuilds itself on every step is navigation that flickers.
 */
export type PhiCmsRegionOwnership = "shell" | "page";

export function resolvePhiCmsRegionOwnership(
  regionKey: string | null | undefined,
): PhiCmsRegionOwnership | undefined {
  if (!regionKey) {
    return undefined;
  }
  if (isPhiCmsShellOwnedRegion(regionKey)) {
    return "shell";
  }
  return isPhiCmsPageOwnedRegion(regionKey) ? "page" : undefined;
}

/**
 * Whether a Widget asking for one kind of Region may stand in this one.
 *
 * A Widget that asks for nothing stands anywhere, which is what nearly all of them do. An unknown
 * Region key answers yes as well: the question is asked while authoring, and a key this build does not
 * know is not a placement anybody chose -- refusing it would hide Widgets over a typo.
 */
export function phiCmsRegionAcceptsWidget(
  regionKey: string | null | undefined,
  required: PhiCmsRegionOwnership | null | undefined,
): boolean {
  if (!required) {
    return true;
  }
  const ownership = resolvePhiCmsRegionOwnership(regionKey);
  return ownership === undefined || ownership === required;
}

export const PHI_CMS_REGION_KEY_BY_TYPE = Object.fromEntries(
  Object.entries(PHI_CMS_REGION_TYPE_BY_KEY).map(([key, type]) => [type, key]),
) as Record<number, PhiCmsRegionKey>;

export function resolvePhiCmsRegionType(regionKey: string | null | undefined) {
  return regionKey && regionKey in PHI_CMS_REGION_TYPE_BY_KEY
    ? PHI_CMS_REGION_TYPE_BY_KEY[regionKey as PhiCmsRegionKey]
    : PhiCmsRegionType.Content;
}

export function resolvePhiCmsRegionKey(regionType: number | null | undefined) {
  return regionType == null ? undefined : PHI_CMS_REGION_KEY_BY_TYPE[regionType];
}
