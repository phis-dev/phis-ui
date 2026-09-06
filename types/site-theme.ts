import type { PhiCmsBackgroundWidgetConfig } from "../components/widgets/config/background";

export type PhiSiteRemSettings = {
  rootValue?: number | null;
};

/**
 * The Theme Root Background (SHELL.md "Root Background and Shell Backdrop Layers"): painted once at
 * the document root, independently per mode, using the canonical structured Phi Background contract.
 * An unconfigured mode falls back to the resolved Ant Design layout background.
 */
export type PhiSiteThemeRoot = {
  background?: {
    light?: PhiCmsBackgroundWidgetConfig | null;
    dark?: PhiCmsBackgroundWidgetConfig | null;
  } | null;
};

export type PhiWidgetFontFamilyKey =
  | "inherit"
  | "system"
  | "body"
  | "mono"
  | "serif"
  | "accent"
  | "display";

export type PhiWidgetFontSizeKey =
  | "inherit"
  | "xs"
  | "sm"
  | "base"
  | "lg"
  | "xl";

// Theme font slots stay stable even if the underlying loading strategy changes later.
// The current shared baseline is body=Fira Sans, mono=Fira Mono, serif=Lora.
// Accent and display remain open slots and currently fall back to body and serif.
export type PhiSiteFontSlots = {
  body?: string | null;
  mono?: string | null;
  serif?: string | null;
  accent?: string | null;
  display?: string | null;
};
