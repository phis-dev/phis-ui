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

type PhiAreaBaseModuleTitle<TArea extends PhiCmsAreaKey> =
  (typeof PHI_AREA_BASE_MODULE_TITLES)[TArea];

type PhiAreaBaseRuntimeModuleDefinitionInput<TArea extends PhiCmsAreaKey> =
  Omit<PhiRuntimeModuleDefinition, "kind" | "eligibleAreas" | "title"> & {
    area: TArea;
  };

export function definePhiAreaBaseRuntimeModuleDefinition<
  TArea extends PhiCmsAreaKey,
  TDefinition extends PhiAreaBaseRuntimeModuleDefinitionInput<TArea>,
>(definition: TDefinition): Omit<TDefinition, "area"> & {
  kind: "module";
  eligibleAreas: readonly [TArea];
  title: PhiAreaBaseModuleTitle<TArea>;
} {
  const { area, ...metadata } = definition;
  return {
    ...metadata,
    kind: "module",
    eligibleAreas: [area],
    title: PHI_AREA_BASE_MODULE_TITLES[area],
  } as Omit<TDefinition, "area"> & {
    kind: "module";
    eligibleAreas: readonly [TArea];
    title: PhiAreaBaseModuleTitle<TArea>;
  };
}
