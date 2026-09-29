/*
 * What a choice control offers is stored as much as drawn: a Form field lists its options or names the
 * provider that answers for them, and phis-server reads the field as it is stored. The shapes and their
 * parsers are therefore `@phis/contracts/controls`.
 */
export {
  parsePhiControlOptionsProviderConfig,
  readPhiControlOptions,
  type PhiControlOption,
  type PhiControlOptionBackgroundPreview,
  type PhiControlOptionFontPreview,
  type PhiControlOptionPreview,
  type PhiControlOptionsProviderConfig,
  type PhiControlOptionsProviderDependency,
  type PhiControlOptionsProviderLoadMode,
  type PhiControlOptionsProviderSearchConfig,
} from "@phis/contracts/controls";
