import type { PhiFormDescriptor } from "../../types/form-descriptor";

/*
 * The Asset inspector's Forms -- the Variants choice under the preview and the metadata Form below it --
 * on tracks of their own, against the house columns: they stand in the Asset inspector Drawer, 377px less
 * the Collapsible's inset, which is `compact` -- where the default stacks its labels -- and an inspector
 * keeps its labels beside the fields. One layout for both, so their labels share one column.
 */
export const PHI_ASSET_INSPECTOR_FORM_LAYOUT = {
  gap: { compact: "sm", medium: "base" },
  label: {
    compact: { start: 1, end: 9 },
    medium: { start: 1, end: 9 },
    wide: { start: 1, end: 7 },
  },
  control: {
    compact: { start: 9, end: 25 },
    medium: { start: 9, end: 25 },
    wide: { start: 7, end: 25 },
  },
} as const satisfies NonNullable<PhiFormDescriptor["layout"]>;
