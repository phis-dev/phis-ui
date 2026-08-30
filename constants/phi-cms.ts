export const PhiCmsPageType = {
  Standard: 0,
  Landing: 1,
  Legal: 2,
  System: 3,
  Redirect: 4,
} as const;

export const PhiCmsStatus = {
  Draft: 0,
  Published: 1,
  Archived: 2,
  Deleted: 3,
} as const;

export const PhiCmsRegionStatus = {
  Draft: 0,
  Active: 1,
  Disabled: 2,
} as const;

export const PhiCmsRegionType = {
  HeaderTop: 10,
  HeaderMain: 11,
  HeaderBottom: 12,
  SiderLeft: 20,
  SiderRight: 21,
  Hero: 25,
  Content: 30,
  FooterTop: 39,
  Footer: 40,
  FooterBottom: 41,
  Drawer: 50,
} as const;
export type PhiCmsRegionTypeValue =
  (typeof PhiCmsRegionType)[keyof typeof PhiCmsRegionType];

export const PhiCmsVisibilityContext = {
  PublicArea: 1 << 0,
  AppArea: 1 << 1,
  AdminArea: 1 << 3,
  EditorArea: 1 << 4,
  AccountingArea: 1 << 6,
  BuilderArea: 1 << 8,
} as const;

export const PhiCmsFlags = {
  SiteCustom: 1 << 0,
  Hidden: 1 << 1,
  MobileOnly: 1 << 2,
  DesktopOnly: 1 << 3,
  Collapsed: 1 << 4,
  NoTranslate: 1 << 5,
} as const;

export const PhiCmsRevisionFlags = {
  Draft: 1 << 0,
  Published: 1 << 1,
  Deleted: 1 << 2,
} as const;

export const DEFAULT_PHI_CMS_VISIBILITY_MASK = PhiCmsVisibilityContext.PublicArea;
