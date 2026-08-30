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
