import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "./contracts";

const PHI_AREA_BASE_MODULE_TITLES = {
  public: "Public Base",
  app: "App Base",
  accounting: "Accounting Base",
  admin: "Admin Base",
  builder: "Builder Base",
  editor: "Editor Base",
} as const satisfies Record<PhiCmsAreaKey, string>;

/**
 * The icon an Area is shown by, which is its base Module's.
 *
 * One answer for every place that draws it: the base Module's own row in the Builder's Modules table and
 * that Area's checkbox column heading beside it, where the icon stands alone and the Area's name is its
 * tooltip. The base Module takes it from here rather than stating its own, so the two cannot drift
 * apart, and the sidebar entries that lead into another Area (`target: { kind: "area" }`) wear it too.
 * Names from the shared icon vocabulary (`@phis/ui/widgets:<family>` is a Widget family's icon).
 */
export const PHI_AREA_ICONS = {
  public: "antd:global",
  app: "antd:appstore",
  accounting: "antd:profile",
  admin: "antd:cluster",
  builder: "antd:build",
  editor: "@phis/ui/widgets:editor",
} as const satisfies Record<PhiCmsAreaKey, string>;

type PhiAreaBaseModuleTitle<TArea extends PhiCmsAreaKey> =
  (typeof PHI_AREA_BASE_MODULE_TITLES)[TArea];

type PhiAreaBaseRuntimeModuleDefinitionInput<TArea extends PhiCmsAreaKey> =
  Omit<PhiRuntimeModuleDefinition, "kind" | "eligibleAreas" | "title" | "icon" | "iconFamily"> & {
    area: TArea;
  };

export function definePhiAreaBaseRuntimeModuleDefinition<
  TArea extends PhiCmsAreaKey,
  TDefinition extends PhiAreaBaseRuntimeModuleDefinitionInput<TArea>,
>(definition: TDefinition): Omit<TDefinition, "area"> & {
  kind: "module";
  eligibleAreas: readonly [TArea];
  title: PhiAreaBaseModuleTitle<TArea>;
  icon: string;
} {
  const { area, ...metadata } = definition;
  return {
    ...metadata,
    kind: "module",
    eligibleAreas: [area],
    title: PHI_AREA_BASE_MODULE_TITLES[area],
    icon: PHI_AREA_ICONS[area],
  } as Omit<TDefinition, "area"> & {
    kind: "module";
    eligibleAreas: readonly [TArea];
    title: PhiAreaBaseModuleTitle<TArea>;
    icon: string;
  };
}
