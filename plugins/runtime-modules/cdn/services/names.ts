"use client";

import { createPhiControlOptionsProviderClient } from "../../../../components/controls/phi-options-provider";
import { PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { loadPhiCdnNames } from "./upload";

/**
 * The names the catalogue holds, as the choices of the upload Form's Name (`forms.ts`): every state, in
 * name order, each the name itself. The field takes a typed name beside them (`select` with
 * `allowCustom`), because a file under a new name is as ordinary as another version of an old one.
 *
 * Read once per mounted field: the upload widget mounts its Form anew after a file was published, so the
 * name just used is among the choices of the next one.
 */
export const PhiCdnNamesOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS.names,
  load: () => loadPhiCdnNames(),
  resolveLoadKey: () => "cdn-names",
  resolve: (context) => {
    const names = Array.isArray(context.asyncData)
      ? context.asyncData.filter((name): name is string => typeof name === "string")
      : [];
    return { options: names.map((name) => ({ value: name, label: name })) };
  },
});
