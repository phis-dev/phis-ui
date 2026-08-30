"use client";

import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../plugins/runtime-modules/core/ids";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../../../../plugins/runtime-modules/core/data-providers";
import { createPhiTableProviderClient } from "./phi-table-provider";
import { createPhiStaticTableProviderRegistration } from "./phi-static-table-provider";

const descriptor = PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS.find((candidate) =>
  candidate.key === PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentTable);

if (!descriptor?.resources) {
  throw new Error("Core Content Table provider descriptor has no resources.");
}

export const PhiContentTableProviderClient = createPhiTableProviderClient(
  createPhiStaticTableProviderRegistration({
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentTable,
    resources: descriptor.resources.map((resource) => ({ descriptor: resource, rows: [] })),
  }),
);
