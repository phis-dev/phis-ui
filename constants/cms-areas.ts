import { PhiCmsVisibilityContext } from "./phi-cms";

export const PHI_CMS_AREA_KEYS = [
  "public",
  "app",
  "admin",
  "builder",
  "editor",
  "accounting",
] as const;

export type PhiCmsAreaKey = (typeof PHI_CMS_AREA_KEYS)[number];

export const PHI_CMS_SPECIAL_AREA_KEYS = PHI_CMS_AREA_KEYS.filter(
  (area): area is Exclude<PhiCmsAreaKey, "public"> => area !== "public",
);

export const PHI_BUILDER_AREA_KEYS = [
  "public",
  "app",
  "admin",
  "builder",
  "editor",
  "accounting",
] as const;

export type PhiBuilderAreaKey = (typeof PHI_BUILDER_AREA_KEYS)[number];

const CMS_AREA_SET = new Set<string>(PHI_CMS_AREA_KEYS);
const CMS_SPECIAL_AREA_SET = new Set<string>(PHI_CMS_SPECIAL_AREA_KEYS);
const BUILDER_AREA_SET = new Set<string>(PHI_BUILDER_AREA_KEYS);

const CMS_AREA_MASK_BY_KEY: Record<PhiCmsAreaKey, number> = {
  public: PhiCmsVisibilityContext.PublicArea,
  app: PhiCmsVisibilityContext.AppArea,
  admin: PhiCmsVisibilityContext.AdminArea,
  builder: PhiCmsVisibilityContext.BuilderArea,
  editor: PhiCmsVisibilityContext.EditorArea,
  accounting: PhiCmsVisibilityContext.AccountingArea,
};

const CMS_AREA_KEY_BY_MASK = new Map<number, PhiCmsAreaKey>(
  Object.entries(CMS_AREA_MASK_BY_KEY).map(([area, mask]) => [mask, area as PhiCmsAreaKey]),
);

const BUILDER_AREA_TO_CMS_AREA_KEY: Record<PhiBuilderAreaKey, PhiCmsAreaKey> = {
  public: "public",
  app: "app",
  admin: "admin",
  builder: "builder",
  editor: "editor",
  accounting: "accounting",
};

const CMS_AREA_LABEL_BY_KEY: Record<PhiCmsAreaKey, string> = {
  public: "Public",
  app: "App",
  admin: "Admin",
  builder: "Builder",
  editor: "Editor",
  accounting: "Accounting",
};

const BUILDER_AREA_LABEL_BY_KEY: Record<PhiBuilderAreaKey, string> = {
  public: "Public",
  app: "App",
  admin: "Admin",
  builder: "Builder",
  editor: "Editor",
  accounting: "Accounting",
};

export const PHI_BUILDER_AREA_OPTIONS = PHI_BUILDER_AREA_KEYS.map((area) => ({
  value: area,
  label: BUILDER_AREA_LABEL_BY_KEY[area],
})) as ReadonlyArray<{ value: PhiBuilderAreaKey; label: string }>;

export function isPhiCmsAreaKey(value: unknown): value is PhiCmsAreaKey {
  return typeof value === "string" && CMS_AREA_SET.has(value);
}

export function isPhiCmsSpecialAreaKey(value: unknown): value is Exclude<PhiCmsAreaKey, "public"> {
  return typeof value === "string" && CMS_SPECIAL_AREA_SET.has(value);
}

export function isPhiBuilderAreaKey(value: unknown): value is PhiBuilderAreaKey {
  return typeof value === "string" && BUILDER_AREA_SET.has(value);
}

export function resolvePhiCmsAreaMask(area: string | null | undefined) {
  return CMS_AREA_MASK_BY_KEY[(area ?? "public") as PhiCmsAreaKey] ?? PhiCmsVisibilityContext.PublicArea;
}

export function resolvePhiCmsAreaKey(areaMask: number): PhiCmsAreaKey {
  return CMS_AREA_KEY_BY_MASK.get(areaMask) ?? "public";
}

export function resolvePhiBuilderAreaMask(area: PhiBuilderAreaKey) {
  return resolvePhiCmsAreaMask(BUILDER_AREA_TO_CMS_AREA_KEY[area]);
}

export function resolvePhiBuilderAreaAsCmsArea(area: PhiBuilderAreaKey): PhiCmsAreaKey {
  return BUILDER_AREA_TO_CMS_AREA_KEY[area];
}

export function resolvePhiCmsAreaLabel(area: PhiCmsAreaKey) {
  return CMS_AREA_LABEL_BY_KEY[area];
}

export function resolvePhiBuilderAreaLabel(area: PhiBuilderAreaKey) {
  return BUILDER_AREA_LABEL_BY_KEY[area];
}
