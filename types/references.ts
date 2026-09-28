/**
 * Internal references, as this package uses them.
 *
 * The codec itself lives in `@phis/contracts/references`, because phi-server reads and writes the same
 * values and the two must agree byte for byte -- it stood here and there in two copies until the short
 * form landed, which is exactly the arrangement the CMS instance id was moved out of for the same
 * reason. What stays here is the one type only the render side has a use for.
 */

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
} from "@phis/contracts/references";

import type { PhiPageReference } from "@phis/contracts/references";

/**
 * The addresses this render's Page targets answer on, resolved once before anything draws.
 *
 * A Map rather than a resolver a Widget may call, because the batching is the contract: references are
 * resolved per render, and a Widget that could ask would ask one at a time -- twelve Cards in a grid,
 * twelve round trips. A reference that is absent here did not resolve, and the Control draws no link.
 */
export type PhiResolvedLinkTargets = ReadonlyMap<PhiPageReference, string>;
