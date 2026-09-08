/*
 * The CMS row vocabulary, held in the contract both sides read it from.
 *
 * These numbers travel: a status, a Region type, a visibility mask and a flag set are written here,
 * checked and stored by phi-server, and read back by both. They stood in two identical files until
 * 2026-09-08, which is the same arrangement the node identity had -- and the same silent failure
 * waiting in it, since a renumbering on one side would have been read as a different Area or a
 * different status on the other, with every row looking correct where it was written.
 *
 * Re-exported rather than imported at every call site: the Widgets, presets and Add-ons that use them
 * name `@phis/ui`, and where the values are decided is not their business.
 */
export {
  DEFAULT_PHI_CMS_VISIBILITY_MASK,
  PhiCmsFlags,
  PhiCmsPageType,
  PhiCmsRegionStatus,
  PhiCmsRegionType,
  PhiCmsRevisionFlags,
  PhiCmsStatus,
  PhiCmsVisibilityContext,
  type PhiCmsRegionTypeValue,
} from "@phis/contracts/cms";
