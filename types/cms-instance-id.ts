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

/**
 * A Page's identity, as the Builder carries it.
 *
 * Re-exported rather than derived here: the same token is what a Module Page reference is made of, so it
 * moved next to the reference codec in `@phis/contracts/references` where both sides reach it. A Page
 * authored in the Builder has no preset to hash and takes a draft-origin id instead.
 */
export { createPhiPresetCmsPageId } from "@phis/contracts/references";

export function createPhiPresetCmsInstanceIdMap<const TNodeKey extends string>(
  identity: Omit<PhiCmsPresetInstanceIdentity, "nodeKey">,
  nodeKeys: readonly TNodeKey[],
): Readonly<Record<TNodeKey, PhiCmsInstanceId>> {
  /*
   * Two nodes under one key would share one id, and the map could only hand out the second: the
   * first node would silently lose its identity. A repeated key is a mistake in the preset, so it is
   * refused where the preset states it.
   */
  const seen = new Set<string>();
  for (const nodeKey of nodeKeys) {
    if (seen.has(nodeKey)) {
      throw new Error(`Preset node key "${nodeKey}" is listed more than once.`);
    }
    seen.add(nodeKey);
  }

  const entries = nodeKeys.map((nodeKey) => [
    nodeKey,
    createPhiPresetCmsInstanceId({ ...identity, nodeKey }),
  ] as const);
  return Object.freeze(Object.fromEntries(entries)) as Readonly<Record<TNodeKey, PhiCmsInstanceId>>;
}
