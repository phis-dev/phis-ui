import { describe, expect, it } from "vitest";

import type { PhiRuntimeModuleDataProviderDescriptor } from "../../../../types/cms-plugins";
import { createPhiMetadataTableProviderRegistration } from "./metadata-table-provider-stand-ins";

/*
 * A Table Provider the Builder may not read (`authoringMode: "none"`) still stands in the canvas with what it
 * declares, so a Table bound to it draws its columns and tools rather than "not available": it answers no
 * rows and reads no record.
 */

const descriptor = {
  key: "@acme/crm/tables/people",
  ownerModuleId: "@acme/crm/modules/crm",
  kind: "table",
  executionMode: "live",
  authoringMode: "none",
  title: "People",
  description: "People of the Site.",
  resources: [{ resourceKey: "people", title: "People", rowIdentityPath: "id", fields: [], recordRead: true }],
} as unknown as Extract<PhiRuntimeModuleDataProviderDescriptor, { kind: "table" }>;

describe("a Table Provider the Builder does not read", () => {
  it("stands in with its declared resources and answers no rows", async () => {
    const registration = createPhiMetadataTableProviderRegistration(descriptor);
    expect(registration.key).toBe(descriptor.key);
    expect(registration.resources).toBe(descriptor.resources);
    await expect(registration.query({ resourceKey: "people" } as never)).resolves.toEqual({ rows: [], total: 0 });
  });

  it("reads no record where a resource declares record reads", async () => {
    const registration = createPhiMetadataTableProviderRegistration(descriptor);
    await expect(registration.readRecord!({} as never)).rejects.toMatchObject({ code: "authoring-not-supported" });
  });
});
