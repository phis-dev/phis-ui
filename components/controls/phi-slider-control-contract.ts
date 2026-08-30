export const PHI_SLIDER_TOOLTIP_MODES = ["auto", "always", "hidden"] as const;

export type PhiSliderTooltipMode = (typeof PHI_SLIDER_TOOLTIP_MODES)[number];
