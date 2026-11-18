import type { PhiMaskPreset } from "../config/mask";

/**
 * What the Builder's mask picker says: its heading, its two modes, the ways to bring a mask in, the four
 * sliders and the name of each preset shape.
 *
 * Carried by the authoring tools (`label-sets/authoring-tools.ts`), which is where the picker is drawn:
 * it is the Image Widget's tool and Core's, so its words are translated in Core and not by whoever places
 * an Image.
 */
export type PhiMaskPickerControlLabels = {
  /** The tool button that opens the picker, as its accessible name. */
  button: string;
  title: string;
  clear: string;
  modePresets: string;
  modeMedia: string;
  selectAsset: string;
  upload: string;
  /** While a mask is on its way; `%1` is the percentage. */
  uploading: string;
  selectIconify: string;
  iconifyButton: string;
  scale: string;
  offsetX: string;
  offsetY: string;
  rotation: string;
  presets: Record<PhiMaskPreset, string>;
};

export const PHI_MASK_PICKER_CONTROL_DEFAULT_LABELS: PhiMaskPickerControlLabels = {
  button: "Select mask",
  title: "Mask",
  clear: "Clear mask",
  modePresets: "Presets",
  modeMedia: "Media",
  selectAsset: "Select mask asset",
  upload: "Upload SVG or PNG mask",
  uploading: "Uploading %1%",
  selectIconify: "Select Iconify mask",
  iconifyButton: "Select Iconify icon",
  scale: "Scale",
  offsetX: "Offset X",
  offsetY: "Offset Y",
  rotation: "Rotation",
  presets: {
    circle: "Circle",
    ellipse: "Ellipse",
    triangle: "Triangle",
    diamond: "Diamond",
    hexagon: "Hexagon",
    star: "Star",
    cloud: "Cloud",
    blob: "Blob",
  },
};

/** Fills the `%1` of a mask picker template. */
export function formatPhiMaskPickerLabel(template: string, value: string | number) {
  return template.replace("%1", String(value));
}
