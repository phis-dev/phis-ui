"use client";

import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../constants/core-data-provider-keys";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import { createPhiTableProviderClient } from "../../../../components/widgets/client/shared/phi-table-provider";
import { createPhiStaticTableProviderRegistration } from "../../../../components/widgets/client/shared/phi-static-table-provider";

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
