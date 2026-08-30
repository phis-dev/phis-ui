"use client";

import { createPhiStaticControlOptionsProviderClient } from "../../../../components/controls/phi-options-provider";
import { PHI_THEME_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";

export const PhiThemePresetsOptionsProviderClient = createPhiStaticControlOptionsProviderClient({
  key: PHI_THEME_RUNTIME_DATA_PROVIDER_KEYS.themePresets,
  resolve: ({ options }) => ({ options }),
});

export const PhiThemeKeysOptionsProviderClient = createPhiStaticControlOptionsProviderClient({
  key: PHI_THEME_RUNTIME_DATA_PROVIDER_KEYS.themeKeys,
  resolve: () => ({ options: [{ value: "default", label: "default" }], value: "default" }),
});
