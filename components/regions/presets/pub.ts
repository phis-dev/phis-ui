import { PHI_PADDING } from "../../../theme/phi-tokens";
import type { PhiCmsAreaPreset, PhiCmsResolvedRegion } from "../../../types";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../../plugins/runtime-modules/builder/runtime-module-defaults";

const PUB_HEADER_TOP_REGION: PhiCmsResolvedRegion = {
  key: "header_top",
  status: 1,
  flags: 0,
  visibilityMask: 0,
  sortOrder: -10,
  config: {
    mode: "light",
    sticky: false,
    shadow: "none",
    border: false,
    size: { height: "55px" },
    offsetTop: 0,
  },
  rootLayoutNodeId: null,
  rootLayoutNode: null,
  source: "fallback",
  allowedPageSlotInjections: [],
};

const PUB_HEADER_MAIN_REGION: PhiCmsResolvedRegion = {
  key: "header_main",
  status: 1,
  flags: 0,
  visibilityMask: 0,
  sortOrder: 0,
  config: {
    mode: "light",
    sticky: true,
    effect: "glass",
    shadow: "none",
    border: false,
    size: { height: "55px" },
    offsetTop: 0,
  },
  rootLayoutNodeId: null,
  rootLayoutNode: null,
  source: "fallback",
  allowedPageSlotInjections: [
    {
      key: "actions",
      label: "Header actions",
      multiple: true,
    },
  ],
};

const PUB_FOOTER_MAIN_REGION: PhiCmsResolvedRegion = {
  key: "footer_main",
  status: 1,
  flags: 0,
  visibilityMask: 0,
  sortOrder: 10,
  config: {
    mode: "dark",
    shadow: "none",
  },
  rootLayoutNodeId: null,
  rootLayoutNode: null,
  source: "fallback",
  allowedPageSlotInjections: [],
};

const PUB_FOOTER_TOP_REGION: PhiCmsResolvedRegion = {
  key: "footer_top",
  status: 1,
  flags: 0,
  visibilityMask: 0,
  sortOrder: 5,
  config: {
    mode: "dark",
  },
  rootLayoutNodeId: null,
  rootLayoutNode: null,
  source: "fallback",
  allowedPageSlotInjections: [
    {
      key: "actions",
      label: "Footer actions",
      multiple: true,
    },
  ],
};

const PUB_FOOTER_BOTTOM_REGION: PhiCmsResolvedRegion = {
  key: "footer_bottom",
  status: 1,
  flags: 0,
  visibilityMask: 0,
  sortOrder: 20,
  config: {
    mode: "dark",
  },
  rootLayoutNodeId: null,
  rootLayoutNode: null,
  source: "fallback",
  allowedPageSlotInjections: [],
};

const PUB_CONTENT_REGION: PhiCmsResolvedRegion = {
  key: "content",
  status: 1,
  flags: 0,
  visibilityMask: 0,
  sortOrder: 20,
  config: {
    size: { width: "100%" },
    maxSize: { width: "100%" },
    padding: `${PHI_PADDING.md}px`,
  },
  rootLayoutNodeId: null,
  rootLayoutNode: null,
  source: "fallback",
  allowedPageSlotInjections: [
    {
      key: "content",
      label: "Content slot",
      multiple: false,
      required: true,
      maxItems: 1,
    },
  ],
};

export const PHI_DEFAULT_PUB_AREA_PRESET: PhiCmsAreaPreset = {
  area: "public",
  label: "Default public preset",
  flags: 0,
  visibilityMask: 0,
  config: {
    runtimeModules: createPhiDefaultAreaRuntimeModuleIds("public"),
  },
  regions: [
    PUB_HEADER_TOP_REGION,
    PUB_HEADER_MAIN_REGION,
    PUB_CONTENT_REGION,
    PUB_FOOTER_TOP_REGION,
    PUB_FOOTER_MAIN_REGION,
    PUB_FOOTER_BOTTOM_REGION,
  ],
};
