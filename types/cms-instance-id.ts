import {
  createPhiPresetCmsInstanceId,
  type PhiCmsInstanceId,
  type PhiCmsPresetInstanceIdentity,
} from "@phis/contracts/cms";

/**
 * The CMS node identity, as this package uses it.
 *
 * The encoding itself lives in `@phis/contracts/cms`, because phi-server derives the same ids and the
 * two must compute them alike -- it stood here and there in two copies until 2026-09-07, including the
 * hash, byte for byte. What stays here are the two conveniences built on top of it, which only this
 * side needs.
 */
export {
  comparePhiCmsInstanceIds,
  createPhiDraftCmsInstanceId,
  createPhiPresetCmsInstanceId,
  isPhiCmsInstanceId,
  readPhiCmsInstanceId,
  readPhiCmsInstanceIdDescriptor,
  type PhiCmsInstanceDomain,
  type PhiCmsInstanceId,
  type PhiCmsInstanceIdDescriptor,
  type PhiCmsInstanceOrigin,
  type PhiCmsPresetInstanceIdentity,
} from "@phis/contracts/cms";

/** The Page itself, not a node inside it -- the one place a Page id differs from a node id. */
const PHI_CMS_PAGE_NODE_KEY = "page";

/**
 * A Page's identity, as the Builder carries it.
 *
 * The pair a Module Page is stored under -- owner and preset key -- hashed to one opaque token. It is
 * recomputable rather than allocated, so no row has to exist before a Page can be addressed, and it
 * never mentions the path: reassigning where a Page answers leaves its drafts exactly where they were.
 * A Page authored in the Builder has no preset to hash and takes a draft-origin id instead.
 */
export function createPhiPresetCmsPageId(
  identity: Omit<PhiCmsPresetInstanceIdentity, "domain" | "nodeKey">,
): PhiCmsInstanceId {
  return createPhiPresetCmsInstanceId({ ...identity, domain: "page", nodeKey: PHI_CMS_PAGE_NODE_KEY });
}

export function createPhiPresetCmsInstanceIdMap<const TNodeKey extends string>(
  identity: Omit<PhiCmsPresetInstanceIdentity, "nodeKey">,
  nodeKeys: readonly TNodeKey[],
): Readonly<Record<TNodeKey, PhiCmsInstanceId>> {
  const entries = nodeKeys.map((nodeKey) => [
    nodeKey,
    createPhiPresetCmsInstanceId({ ...identity, nodeKey }),
  ] as const);
  return Object.freeze(Object.fromEntries(entries)) as Readonly<Record<TNodeKey, PhiCmsInstanceId>>;
}
