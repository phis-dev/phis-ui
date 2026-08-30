export type PhiSiteRemSettings = {
  rootValue?: number | null;
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
