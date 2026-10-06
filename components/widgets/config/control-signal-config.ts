import type {
  PhiCmsConfigField,
} from "../../../types";
import type {
  PhiSignalRouteSet,
} from "../../../types/signals";
import {
  readPhiSignalRouteSet,
} from "../../../types/signals";
import {
  PHI_CONTROL_SIZES,
  readPhiControlSize,
  type PhiControlSize,
  type PhiControlPresentationConfig,
} from "../../../types/control";
import { readBoolean, readNumber, readString } from "./parser-primitives";

export type PhiControlSignalConfig = {
  signalRoutes?: PhiSignalRouteSet | null;
  key?: string;
};

export type PhiControlStateConfig = PhiControlSignalConfig & {
  readOnly?: boolean;
  disabled?: boolean;
};

export type PhiControlConfig<
  TSize extends PhiControlSize = PhiControlSize,
> = PhiControlStateConfig & PhiControlPresentationConfig<TSize>;

export type PhiControlBadgeConfig = {
  badgeEnabled?: boolean;
  badgeText?: string;
  badgeCount?: number;
  badgeShowZero?: boolean;
  badgeOverflowCount?: number;
  badgeColor?: string;
};

export type PhiControlSignalConfigDefaults = {
  key: string;
};

export const PHI_CONTROL_READ_ONLY_FIELD = {
  key: "readOnly",
  type: "boolean",
  label: "Read only",
} satisfies PhiCmsConfigField;

export const PHI_CONTROL_DISABLED_FIELD = {
  key: "disabled",
  type: "boolean",
  label: "Disabled",
} satisfies PhiCmsConfigField;

export const PHI_CONTROL_STATE_FIELDS = [
  PHI_CONTROL_READ_ONLY_FIELD,
  PHI_CONTROL_DISABLED_FIELD,
] satisfies PhiCmsConfigField[];

export const PHI_CONTROL_SIZE_FIELD = {
  key: "controlSize",
  type: "choice",
  label: "Size",
  options: [
    { value: "small", label: "Small" },
    { value: "medium", label: "Medium" },
    { value: "large", label: "Large" },
  ],
} satisfies PhiCmsConfigField;

export const PHI_CONTROL_PRESENTATION_FIELDS = [
  PHI_CONTROL_SIZE_FIELD,
] satisfies PhiCmsConfigField[];

export const PHI_COMPACT_CONTROL_SIZE_FIELD = {
  ...PHI_CONTROL_SIZE_FIELD,
  options: PHI_CONTROL_SIZE_FIELD.options.filter((option) => option.value !== "large"),
} satisfies PhiCmsConfigField;

export const PHI_COMPACT_CONTROL_PRESENTATION_FIELDS = [
  PHI_COMPACT_CONTROL_SIZE_FIELD,
] satisfies PhiCmsConfigField[];

export const PHI_CONTROL_BADGE_FIELDS = [
  {
    key: "badgeEnabled",
    type: "boolean",
    heading: "Badge",
    label: "Enabled",
    description: "Enables optional badge chrome for this control.",
  },
  {
    key: "badgeText",
    type: "string",
    label: "Text",
    visibleWhen: { field: "badgeEnabled", equals: true },
  },
  {
    key: "badgeCount",
    type: "number",
    label: "Count",
    min: 0,
    precision: 0,
    visibleWhen: { field: "badgeEnabled", equals: true },
  },
  {
    key: "badgeOverflowCount",
    type: "number",
    label: "Overflow count",
    min: 0,
    precision: 0,
    visibleWhen: { field: "badgeEnabled", equals: true },
  },
  {
    key: "badgeShowZero",
    type: "boolean",
    label: "Show zero",
    visibleWhen: { field: "badgeEnabled", equals: true },
  },
  {
    key: "badgeColor",
    type: "color",
    mode: "single",
    defaultToken: "colorError",
    label: "Color",
    visibleWhen: { field: "badgeEnabled", equals: true },
  },
] satisfies PhiCmsConfigField[];

export function parsePhiControlSignalConfig(
  config: Record<string, unknown>,
  defaults: PhiControlSignalConfigDefaults,
): Required<Pick<PhiControlSignalConfig, "key">> & Pick<PhiControlSignalConfig, "signalRoutes"> {
  return {
    signalRoutes: readPhiSignalRouteSet(config.signalRoutes),
    key: readString(config.key) ?? defaults.key,
  };
}

export function parsePhiControlStateConfig(
  config: Record<string, unknown>,
  defaults: PhiControlSignalConfigDefaults,
): Required<Pick<PhiControlStateConfig, "key">> &
  Pick<PhiControlStateConfig, "signalRoutes" | "readOnly" | "disabled"> {
  return {
    ...parsePhiControlSignalConfig(config, defaults),
    readOnly: readBoolean(config.readOnly),
    disabled: readBoolean(config.disabled),
  };
}

export function parsePhiControlPresentationConfig<
  TSize extends PhiControlSize = PhiControlSize,
>(
  config: Record<string, unknown>,
  allowedSizes?: readonly TSize[],
): PhiControlPresentationConfig<TSize> {
  const controlSize = readPhiControlSize(config.controlSize);
  const resolvedAllowedSizes: readonly PhiControlSize[] = allowedSizes ?? PHI_CONTROL_SIZES;
  return {
    controlSize: controlSize != null && resolvedAllowedSizes.includes(controlSize)
      ? controlSize as TSize
      : undefined,
  };
}

export function parsePhiControlConfig<
  TSize extends PhiControlSize = PhiControlSize,
>(
  config: Record<string, unknown>,
  defaults: PhiControlSignalConfigDefaults,
  allowedSizes?: readonly TSize[],
): Required<Pick<PhiControlConfig<TSize>, "key">> &
  Pick<PhiControlConfig<TSize>, "signalRoutes" | "readOnly" | "disabled" | "controlSize"> {
  const { controlSize } = parsePhiControlPresentationConfig(config, allowedSizes);
  return {
    ...parsePhiControlStateConfig(config, defaults),
    /*
     * Unset, a Control is drawn at medium; stated here, the Inspector shows it chosen instead of an
     * empty Size. Nothing around a Widget hands it a size to inherit.
     */
    controlSize: controlSize ?? ((allowedSizes ?? PHI_CONTROL_SIZES).includes("medium" as TSize) ? "medium" as TSize : undefined),
  };
}

export function parsePhiControlBadgeConfig(config: Record<string, unknown>): PhiControlBadgeConfig {
  return {
    badgeEnabled: readBoolean(config.badgeEnabled),
    badgeText: readString(config.badgeText),
    badgeCount: readNumber(config.badgeCount),
    badgeShowZero: readBoolean(config.badgeShowZero),
    badgeOverflowCount: readNumber(config.badgeOverflowCount),
    badgeColor: readString(config.badgeColor),
  };
}
