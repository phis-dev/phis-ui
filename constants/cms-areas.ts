import { PhiCmsVisibilityContext } from "./phi-cms";

/**
 * The Areas a Site has, from `@phis/contracts` -- the same place their masks come from.
 *
 * Both repositories kept their own copy of the list, so a Site gaining an Area would have gained it
 * twice. The masks never were copied, for the reason stated there, and the names are that agreement
 * read the other way round.
 */
export { PHI_CMS_AREA_KEYS, isPhiCmsAreaKey, type PhiCmsAreaKey } from "@phis/contracts/cms";

import { PHI_CMS_AREA_KEYS, type PhiCmsAreaKey } from "@phis/contracts/cms";

export const PHI_CMS_SPECIAL_AREA_KEYS = PHI_CMS_AREA_KEYS.filter(
  (area): area is Exclude<PhiCmsAreaKey, "public"> => area !== "public",
);

/**
 * The Areas the Builder can open. A different question from the Areas a Site has (see
 * `resolvePhiCmsAreaAsBuilderArea`), answered today by the same list.
 */
export const PHI_BUILDER_AREA_KEYS: typeof PHI_CMS_AREA_KEYS = PHI_CMS_AREA_KEYS;

export type PhiBuilderAreaKey = (typeof PHI_BUILDER_AREA_KEYS)[number];

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

const CMS_AREA_TO_BUILDER_AREA_KEY = new Map<PhiCmsAreaKey, PhiBuilderAreaKey>(
  (Object.entries(BUILDER_AREA_TO_CMS_AREA_KEY) as Array<[PhiBuilderAreaKey, PhiCmsAreaKey]>)
    .map(([builderArea, cmsArea]) => [cmsArea, builderArea]),
);

/**
 * The Builder Area that edits this CMS Area, or `null` where none does.
 *
 * The two lists hold the same names today and are still two questions: one is the Areas a Site has, the
 * other the Areas the Builder can open. `null` is the honest answer for an Area nobody edits, and the
 * caller that gets it has no catalog to show -- which is different from an empty one.
 */
export function resolvePhiCmsAreaAsBuilderArea(area: PhiCmsAreaKey): PhiBuilderAreaKey | null {
  return CMS_AREA_TO_BUILDER_AREA_KEY.get(area) ?? null;
}
