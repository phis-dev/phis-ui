import type { PhiRuntimeModuleDataProviderDescriptor } from "../../../types/cms-plugins";
import type { PhiProviderResourceSource, PhiRuntimeDataProviderKey } from "../../../types/runtime-data-provider";

/*
 * What a Collection binding that does not hold says, in one wording wherever it is found out: by the
 * live binding against the providers the Area mounted, and by the Builder against the descriptors the
 * Area's Modules declare. An author who reads one in the Builder finds the same line in the log of the
 * live page.
 */
export const PhiCollectionSourceFailureText = {
  notConfigured: () => "Collection data provider is not configured.",
  providerUnavailable: (providerKey: string) =>
    `Collection provider "${providerKey}" is not available from the active runtime modules.`,
  resourceUnavailable: (resourceKey: string, providerKey: string) =>
    `Collection resource "${resourceKey}" is not available from provider "${providerKey}".`,
  rendererUnavailable: (rendererKey: string) =>
    `Item renderer "${rendererKey}" is not available from the active runtime modules.`,
} as const;

/**
 * Why a Collection View cannot draw, as far as that is known without asking the source anything.
 *
 * This is what the Builder can say: it never reads the data, so a read that would fail is not its to
 * find out, but a binding to a provider no active Module declares, a resource that provider does not
 * have, or an item renderer nobody offers is plain from the declarations alone.
 *
 * `itemRendererKeys` is the set of renderers the Area's Modules declare, or null where the caller does
 * not have it -- and then a renderer the configuration names is not judged at all rather than judged
 * against nothing. The renderer a resource ships with is never judged: it belongs to the provider just
 * found active.
 */
export function readPhiCollectionViewDeclaredFailure({
  source,
  itemRendererKey,
  dataProviderDescriptorsByKey,
  itemRendererKeys,
}: {
  source: PhiProviderResourceSource | null | undefined;
  itemRendererKey: string | null | undefined;
  dataProviderDescriptorsByKey: ReadonlyMap<PhiRuntimeDataProviderKey, PhiRuntimeModuleDataProviderDescriptor>;
  itemRendererKeys: ReadonlySet<string> | null;
}): string | null {
  if (!source) {
    return PhiCollectionSourceFailureText.notConfigured();
  }
  const descriptor = dataProviderDescriptorsByKey.get(source.providerKey);
  if (!descriptor || descriptor.kind !== "collection") {
    return PhiCollectionSourceFailureText.providerUnavailable(source.providerKey);
  }
  const resource = descriptor.resources.find((entry) => entry.resourceKey === source.resourceKey);
  if (!resource) {
    return PhiCollectionSourceFailureText.resourceUnavailable(source.resourceKey, source.providerKey);
  }
  if (itemRendererKey && itemRendererKey !== resource.itemRendererKey && itemRendererKeys &&
    !itemRendererKeys.has(itemRendererKey)) {
    return PhiCollectionSourceFailureText.rendererUnavailable(itemRendererKey);
  }
  return null;
}
