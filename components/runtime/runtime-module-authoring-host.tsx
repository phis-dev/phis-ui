import type { ReactNode } from "react";

import type { PhiRuntimeDataProviderKey } from "../../types";
import { PhiControlOptionsProviderIsolationBoundary } from "../controls/phi-options-provider";
import { PhiTableProviderIsolationBoundary } from "../widgets/client/shared/phi-table-provider";
import { PhiTreeProviderIsolationBoundary } from "../widgets/client/shared/phi-tree-provider";
import { PhiCollectionProviderIsolationBoundary } from "../widgets/client/shared/phi-collection-provider";
import { PhiRuntimeModuleDataProviderClientHost } from "./runtime-module-data-provider-client-manifest";

export function PhiRuntimeModuleAuthoringDataProviderHost({
  providerKeys,
  children,
}: {
  providerKeys: readonly PhiRuntimeDataProviderKey[];
  children: ReactNode;
}) {
  return (
    <PhiControlOptionsProviderIsolationBoundary>
      <PhiTableProviderIsolationBoundary>
        <PhiTreeProviderIsolationBoundary>
          <PhiCollectionProviderIsolationBoundary>
            <PhiRuntimeModuleDataProviderClientHost
              providerKeys={providerKeys}
              mode="authoring"
            >
              {children}
            </PhiRuntimeModuleDataProviderClientHost>
          </PhiCollectionProviderIsolationBoundary>
        </PhiTreeProviderIsolationBoundary>
      </PhiTableProviderIsolationBoundary>
    </PhiControlOptionsProviderIsolationBoundary>
  );
}
