import type { ReactNode } from "react";

import type {
  PhiRuntimeModuleId,
  PhiRuntimeDataProviderKey,
} from "../../types";
import { PhiControlOptionsProviderIsolationBoundary } from "../controls/phi-options-provider";
import { PhiTableProviderIsolationBoundary } from "../widgets/client/shared/phi-table-provider";
import { PhiTreeProviderIsolationBoundary } from "../widgets/client/shared/phi-tree-provider";
import { PhiCollectionProviderIsolationBoundary } from "../widgets/client/shared/phi-collection-provider";
import { PhiRuntimeModuleAuthoringClientHost } from "./runtime-module-authoring-client-host";
import { PhiRuntimeModuleDataProviderClientHost } from "./runtime-module-data-provider-client-manifest";

export async function PhiRuntimeModuleAuthoringHost({
  moduleIds,
  dataProviderKeys,
  children,
}: {
  moduleIds: readonly PhiRuntimeModuleId[];
  dataProviderKeys: readonly PhiRuntimeDataProviderKey[];
  children: ReactNode;
}) {
  return (
    <PhiRuntimeModuleAuthoringDataProviderHost providerKeys={dataProviderKeys}>
      <PhiRuntimeModuleAuthoringClientHost moduleIds={moduleIds}>
        {children}
      </PhiRuntimeModuleAuthoringClientHost>
    </PhiRuntimeModuleAuthoringDataProviderHost>
  );
}

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
