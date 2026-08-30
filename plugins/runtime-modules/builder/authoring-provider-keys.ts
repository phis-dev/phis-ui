import type { PhiRuntimeDataProviderKey } from "../../../types/runtime-data-provider";
import type { PhiRuntimeModuleDataProviderDescriptor } from "../../../types/cms-plugins";

/**
 * Data providers the Builder's OWN chrome binds, independent of the Area being edited.
 *
 * The Asset picker a Markdown or Rich Text Widget offers from its toolbar, and the Background picker in
 * the Inspector, are Builder surfaces reaching into the Site's Media library. Neither depends on the
 * edited Area activating the Assets Module: a `phi:asset/...` reference is resolved by the core
 * reference resolver, so an Area without that Module still renders its images. Gating the picker on the
 * Module left it reporting "not available from the active runtime modules" over an empty library.
 *
 * Which Widgets an author may place still follows the Area's active modules. This is only about what
 * the Builder's own pickers can read.
 *
 * The set is collected from the catalog rather than listed here, because a list inside the Builder can
 * only ever name first-party providers: an installed package cannot write itself into this file. The
 * owning Module declares `availableToAuthoringChrome` on its provider descriptor instead.
 */
export function resolvePhiBuilderAuthoringPickerDataProviderKeys(
  entries: readonly { dataProviderDescriptors: readonly PhiRuntimeModuleDataProviderDescriptor[] }[],
): readonly PhiRuntimeDataProviderKey[] {
  const keys = new Set<PhiRuntimeDataProviderKey>();
  for (const entry of entries) {
    for (const descriptor of entry.dataProviderDescriptors) {
      if (descriptor.availableToAuthoringChrome) {
        keys.add(descriptor.key);
      }
    }
  }
  return [...keys];
}
