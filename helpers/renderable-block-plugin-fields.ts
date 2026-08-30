import type { PhiCmsConfigField } from "../types";

export const PHI_RENDERABLE_BLOCK_GEOMETRY_FIELDS: readonly PhiCmsConfigField[] = [
  {
    key: "size",
    type: "dimension",
    label: "Size",
    editorPlacement: "geometry",
    widthPlaceholder: "Width",
    heightPlaceholder: "Height",
  },
  {
    key: "minSize",
    type: "dimension",
    label: "Min Size",
    editorPlacement: "geometry",
    widthPlaceholder: "Min width",
    heightPlaceholder: "Min height",
  },
  {
    key: "maxSize",
    type: "dimension",
    label: "Max Size",
    editorPlacement: "geometry",
    widthPlaceholder: "Max width",
    heightPlaceholder: "Max height",
  },
  {
    key: "collapsedSizeHint",
    type: "dimension",
    label: "Collapsed Size",
    widthPlaceholder: "Collapsed width",
    heightPlaceholder: "Collapsed height",
  },
];

export const PHI_RENDERABLE_BLOCK_PLUGIN_FIELDS: readonly PhiCmsConfigField[] = [
  ...PHI_RENDERABLE_BLOCK_GEOMETRY_FIELDS,
  { key: "opacity", type: "number", label: "Opacity" },
  { key: "shadow", type: "string", label: "Shadow" },
];
