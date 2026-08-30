import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_THEME_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";

export const PHI_THEME_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_THEME_RUNTIME_DATA_PROVIDER_KEYS.themePresets,
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "static",
    authoringMode: "read",
    title: "Theme presets",
    description: "Installed theme preset metadata.",
  },
  {
    key: PHI_THEME_RUNTIME_DATA_PROVIDER_KEYS.themeKeys,
    ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "static",
    authoringMode: "read",
    title: "Theme keys",
    description: "Available runtime theme keys.",
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
