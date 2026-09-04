"use client";

import { useMemo, type ReactNode } from "react";

import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../../../../plugins/runtime-modules/builder/data-providers";
import { resolvePhiBuilderAreaAsCmsArea } from "../../../../constants/cms-areas";
import { readPhiRuntimeModuleCategory } from "../../../../constants/runtime-module-categories";
import { resolvePhiRuntimeAreaDefinition } from "../../area-definitions";
import { applyPhiBuilderRuntimeModuleSelectionChange } from "../runtime-module-selection";
import { usePhiDeveloperBuilderStateValue } from "../developer-workspace-store";
import type { PhiDeveloperBuilderWorkspaceState } from "../developer-workspace-types";
import {
  PhiTableProviderClient,
  type PhiTableProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-table-provider";
import {
  queryPhiStaticTableResource,
} from "../../../../components/widgets/client/shared/phi-static-table-provider";
import type {
  PhiTableProviderMutationRequest,
  PhiTableProviderMutationResult,
  PhiTableProviderQueryRequest,
} from "../../../../types/table-widget";

const RESOURCE_KEY = "modules";
const DETAIL_RESOURCE_KEY = "moduleDetail";

/**
 * The Area's installed Modules, as table rows.
 *
 * The Platform Module is left out entirely: it is the one Module that is never a choice, so a row for
 * it would only ever be a switch nobody may touch. The Area selector is the filter: a Module the chosen
 * Area cannot carry is not a row here at all, because the selection being edited is that Area's, and
 * the full list of Areas a Module serves is a fact about the Module, shown in its detail view.
 */
function readAreaLabels(params: Record<string, unknown> | undefined) {
  const candidate = params?.areaLabels;
  if (candidate == null || typeof candidate !== "object") {
    return null;
  }
  return candidate as Record<string, string>;
}

function buildRuntimeModuleRows(
  state: PhiDeveloperBuilderWorkspaceState,
  categoryLabels: Record<string, string> | null,
) {
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(state.area);
  const baseModuleId = resolvePhiRuntimeAreaDefinition(cmsArea).baseModuleId;
  const activeModuleIds = new Set(state.runtimeModuleIdsByArea[state.area] ?? []);

  return state.runtimeModuleDefinitions
    .filter((definition) =>
      definition.kind !== "platform" && definition.eligibleAreas.includes(cmsArea))
    .map((definition) => {
      const isBaseModule = definition.moduleId === baseModuleId;
      return {
        moduleId: definition.moduleId,
        active: isBaseModule || activeModuleIds.has(definition.moduleId),
        locked: isBaseModule,
        icon: definition.icon ?? (definition.iconFamily ? `@phis/ui/widgets:${definition.iconFamily}` : ""),
        title: definition.title,
        description: definition.description,
        category: categoryLabels?.[readPhiRuntimeModuleCategory(definition.category)] ?? definition.category,
        isBaseModule,
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title, "en", { sensitivity: "base" }));
}

function readLabelMap(params: Record<string, unknown> | undefined, key: string) {
  const candidate = params?.[key];
  if (candidate == null || typeof candidate !== "object") {
    return null;
  }
  return candidate as Record<string, string>;
}

/**
 * The detail rows for one Module, as field/value pairs.
 *
 * Only what the Module contract actually carries today: vendor, support link, manual and version are
 * declared nowhere yet, and a row promising them empty would read as a Module that failed to state them
 * rather than as a contract that has not grown them.
 */
function buildRuntimeModuleDetailRows(
  state: PhiDeveloperBuilderWorkspaceState,
  moduleId: string,
  areaLabels: Record<string, string> | null,
  detailLabels: Record<string, string> | null,
  categoryLabels: Record<string, string> | null,
) {
  const definition = state.runtimeModuleDefinitions.find((candidate) => candidate.moduleId === moduleId);
  if (!definition) {
    return [];
  }

  const cmsArea = resolvePhiBuilderAreaAsCmsArea(state.area);
  const isBaseModule = definition.moduleId === resolvePhiRuntimeAreaDefinition(cmsArea).baseModuleId;
  const active = isBaseModule || (state.runtimeModuleIdsByArea[state.area] ?? []).includes(definition.moduleId);
  const label = (key: string, fallback: string) => detailLabels?.[key] ?? fallback;
  const yesNo = (value: boolean) =>
    value ? label("yes", "Yes") : label("no", "No");

  return [
    { key: "moduleId", label: label("moduleId", "Module id"), value: definition.moduleId },
    { key: "title", label: label("title", "Module"), value: definition.title },
    { key: "description", label: label("description", "Description"), value: definition.description },
    {
      key: "category",
      label: label("category", "Category"),
      value: categoryLabels?.[readPhiRuntimeModuleCategory(definition.category)] ?? definition.category,
    },
    {
      key: "eligibleAreas",
      label: label("eligibleAreas", "Eligible areas"),
      value: definition.eligibleAreas.map((areaKey) => areaLabels?.[areaKey] ?? areaKey).join(", "),
    },
    { key: "baseModule", label: label("baseModule", "Area Base module"), value: yesNo(isBaseModule) },
    { key: "active", label: label("active", "Active in this Area"), value: yesNo(active) },
  ];
}

export function PhiBuilderRuntimeModulesTableProviderClient({ children }: { children: ReactNode }) {
  const builderState = usePhiDeveloperBuilderStateValue("public", (state) => state);

  const registration = useMemo<PhiTableProviderRegistration>(() => {
    const descriptor = PHI_BUILDER_RUNTIME_DATA_PROVIDER_DESCRIPTORS.find((candidate) =>
      candidate.key === PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.runtimeModulesTable);
    const resources = descriptor?.kind === "table" ? descriptor.resources : [];
    const resourceDescriptor = resources.find((resource) => resource.resourceKey === RESOURCE_KEY);
    const detailResourceDescriptor = resources.find((resource) => resource.resourceKey === DETAIL_RESOURCE_KEY);
    if (!resourceDescriptor || !detailResourceDescriptor) {
      throw new Error("Runtime Modules Table provider descriptor has no resource.");
    }

    const query = async (request: PhiTableProviderQueryRequest) => {
      if (request.resourceKey === DETAIL_RESOURCE_KEY) {
        const moduleId = typeof request.params?.moduleId === "string" ? request.params.moduleId : "";
        return queryPhiStaticTableResource(
          {
            descriptor: detailResourceDescriptor,
            rows: buildRuntimeModuleDetailRows(
              builderState,
              moduleId,
              readAreaLabels(request.params),
              readLabelMap(request.params, "detailLabels"),
              readLabelMap(request.params, "categoryLabels"),
            ),
          },
          request,
        );
      }
      if (request.resourceKey !== RESOURCE_KEY) {
        throw new Error("Unknown Runtime Modules Table resource.");
      }
      return queryPhiStaticTableResource(
        {
          descriptor: resourceDescriptor,
          rows: buildRuntimeModuleRows(builderState, readLabelMap(request.params, "categoryLabels")),
        },
        request,
      );
    };

    const mutate = async (
      request: PhiTableProviderMutationRequest,
    ): Promise<PhiTableProviderMutationResult> => {
      if (request.resourceKey !== RESOURCE_KEY) {
        throw new Error("Unknown Runtime Modules Table resource.");
      }
      if (request.kind !== "field" || request.fieldKey !== "active") {
        return { status: "rejected", invalidation: "none", errorCode: "unsupported-mutation" };
      }

      const cmsArea = resolvePhiBuilderAreaAsCmsArea(builderState.area);
      const moduleId = String(request.rowIdentity);
      const definition = builderState.runtimeModuleDefinitions.find((candidate) => candidate.moduleId === moduleId);
      if (!definition) {
        return { status: "rejected", invalidation: "none", errorCode: "not-found", message: "Module not found." };
      }
      const baseModuleId = resolvePhiRuntimeAreaDefinition(cmsArea).baseModuleId;
      if (moduleId === baseModuleId) {
        return {
          status: "rejected",
          invalidation: "none",
          errorCode: "locked",
          message: `"${definition.title}" is this Area's Base module and is always active.`,
        };
      }
      if (!definition.eligibleAreas.includes(cmsArea)) {
        return {
          status: "rejected",
          invalidation: "none",
          errorCode: "ineligible",
          message: `"${definition.title}" is not eligible for Area "${cmsArea}".`,
        };
      }

      const proposedActive = request.proposedValue === true;
      const currentModuleIds = builderState.runtimeModuleIdsByArea[builderState.area] ?? [];
      const nextModuleIds = proposedActive
        ? [...currentModuleIds, definition.moduleId]
        : currentModuleIds.filter((candidateId) => candidateId !== definition.moduleId);

      try {
        applyPhiBuilderRuntimeModuleSelectionChange(builderState.area, nextModuleIds, "public");
      } catch (error) {
        return {
          status: "rejected",
          invalidation: "none",
          errorCode: "invalid-selection",
          message: error instanceof Error ? error.message : "Invalid Module selection.",
        };
      }

      return { status: "accepted", invalidation: "view", rowPatch: { active: proposedActive } };
    };

    return {
      key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.runtimeModulesTable,
      resources: [resourceDescriptor, detailResourceDescriptor],
      query,
      mutate,
    };
  }, [builderState]);

  return <PhiTableProviderClient registration={registration}>{children}</PhiTableProviderClient>;
}
