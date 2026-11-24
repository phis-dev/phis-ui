"use client";

import { useMemo, type ReactNode } from "react";

import { PhiTableProviderClient, type PhiTableProviderRegistration } from "../../../../components/widgets/client/shared/phi-table-provider";
import type { PhiRuntimeModuleDataProviderDescriptor } from "../../../../types/cms-plugins";
import type { PhiRuntimeDataProviderKey } from "../../../../types/runtime-data-provider";
import { PhiTableProviderError } from "../../../../types/table-widget";

/**
 * What the canvas has of a Table Provider the Builder may not read: its declaration, and no rows.
 *
 * `authoringMode: "none"` exposes metadata and binding fields only (TABLES.md), so the edited Area's
 * Module never hands the canvas a Client for it. A Table bound to one -- the conversations inbox, the
 * groups, the customer file -- found no Provider at all and drew "not available from the active runtime
 * modules", which reads as a Module that is switched off when it is the Builder keeping its hands off a
 * person's data. Standing in with the declared resources and an empty answer lets the Table draw its
 * columns, tools and binding fields as an author arranges them, and asks the Site nothing.
 */
export function createPhiMetadataTableProviderRegistration(
  descriptor: Extract<PhiRuntimeModuleDataProviderDescriptor, { kind: "table" }>,
): PhiTableProviderRegistration {
  return {
    key: descriptor.key,
    resources: descriptor.resources,
    query: async () => ({ rows: [], total: 0 }),
    ...(descriptor.resources.some((resource) => resource.recordRead === true)
      ? {
          readRecord: async () => {
            throw new PhiTableProviderError(
              "authoring-not-supported",
              `The Builder does not read records of "${descriptor.key}".`,
            );
          },
        }
      : {}),
  };
}

export function PhiBuilderMetadataTableProviders({
  descriptors,
  mountedProviderKeys,
  children,
}: {
  descriptors: readonly PhiRuntimeModuleDataProviderDescriptor[];
  /** Providers the canvas mounts for real (the Builder's own pickers), which need no stand-in. */
  mountedProviderKeys: readonly PhiRuntimeDataProviderKey[];
  children: ReactNode;
}) {
  const registrations = useMemo(() => {
    const mounted = new Set(mountedProviderKeys);
    return descriptors.flatMap((descriptor) =>
      descriptor.kind === "table" && descriptor.authoringMode === "none" && !mounted.has(descriptor.key)
        ? [createPhiMetadataTableProviderRegistration(descriptor)]
        : []);
  }, [descriptors, mountedProviderKeys]);
  return registrations.reduceRight<ReactNode>(
    (nested, registration) => (
      <PhiTableProviderClient key={registration.key} registration={registration}>
        {nested}
      </PhiTableProviderClient>
    ),
    children,
  );
}
