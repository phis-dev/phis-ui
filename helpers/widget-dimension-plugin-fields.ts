import type { PhiCmsConfigField } from "../types";

export const PHI_WIDGET_DIMENSION_PLUGIN_FIELDS: readonly PhiCmsConfigField[] = [
  {
    key: "size",
    type: "dimension",
    label: "Size",
    editorPlacement: "geometry",
    widthPlaceholder: "Width",
    heightPlaceholder: "Height",
  },
];
