export {
  PHIS_INTERNAL_ASSET_SCHEME,
  PHIS_INTERNAL_PAGE_SCHEME,
  PHI_LINK_TARGET_CONFIG_KEY,
  createPhiAssetUri,
  createPhiPageReference,
  createPhiPageUri,
  createPhiPresetCmsPageId,
  isPhiLinkTargetConfigKey,
  isPhiStorableExternalHref,
  readPhiInternalReference,
  readPhiLinkTarget,
  readPhiPageReference,
  type PhiInternalReference,
  type PhiLinkTarget,
  type PhiPageReference,
  type PhiPageTarget,
  type PhiPageTargetInput,
  type PhiResolvedLinkTargets,
} from "./types/references";
export { resolvePhiLinkHref } from "./helpers/link-target";
export {
  PHI_PUBLIC_BASE_PAGE_PRESET_KEYS,
  PHI_PUBLIC_BASE_PAGE_REFERENCES,
} from "./plugins/runtime-modules/public-base-page-references";
