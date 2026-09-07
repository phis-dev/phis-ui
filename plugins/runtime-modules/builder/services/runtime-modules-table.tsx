"use client";

import { useMemo, type ReactNode } from "react";

import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import {
  PHI_BUILDER_MODULES_TABLE_FILTER_KEYS,
  PHI_BUILDER_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
} from "../../../../plugins/runtime-modules/builder/data-providers";
import {
  isPhiBuilderAreaKey,
  isPhiCmsAreaKey,
  PHI_CMS_AREA_KEYS,
  type PhiCmsAreaKey,
} from "../../../../constants/cms-areas";
import { readPhiRuntimeModuleCategory } from "../../../../constants/runtime-module-categories";
import type { PhiRuntimeModuleId } from "../../../../types";
import { resolvePhiRuntimeAreaDefinition } from "../../area-definitions";
import { applyPhiBuilderRuntimeModuleSelectionChanges } from "../runtime-module-selection";
import {
  answerPhiBuilderPublicRouteCollision,
  openPhiBuilderPublicRouteCollisionRequest,
  usePhiDeveloperBuilderStateValue,
} from "../developer-workspace-store";
import { resolvePhiBuilderPublicRouteCollisionAnswers } from "../public-route-collisions";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderWorkspaceState,
} from "../developer-workspace-types";
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
const PUBLIC_ROUTES_RESOURCE_KEY = "publicRouteCollisions";

/**
 * The site's installed Modules, as table rows -- one row per Module, across every Area at once.
 *
 * The Platform Module is left out entirely: it is the one Module that is never a choice, so a row for
 * it would only ever be a switch nobody may touch. Everything else is a row regardless of which Areas
 * it serves: the row's switch answers "does this Module run anywhere", and one `area_*` cell per
 * eligible Area answers "where exactly". An Area the Module cannot carry holds `null` there, which the
 * cell renders as nothing at all.
 *
 * Both table filters narrow which rows are listed and never what a cell means: `area` keeps the Modules
 * eligible for one Area, `showFoundation` admits the Modules that carry the Areas themselves -- those are
 * the site's own scaffolding rather than a choice, which is why it starts off.
 */
function readAreaLabels(params: Record<string, unknown> | undefined) {
  const candidate = params?.areaLabels;
  if (candidate == null || typeof candidate !== "object") {
    return null;
  }
  return candidate as Record<string, string>;
}

function isModuleActiveInArea(
  state: Pick<PhiDeveloperBuilderWorkspaceState, "runtimeModuleIdsByArea">,
  moduleId: string,
  cmsArea: PhiCmsAreaKey,
) {
  if (!isPhiBuilderAreaKey(cmsArea)) {
    return false;
  }
  return (state.runtimeModuleIdsByArea[cmsArea] ?? []).includes(moduleId as PhiRuntimeModuleId);
}

type PhiRuntimeModulesTableView = {
  areaFilter: PhiCmsAreaKey | null;
  showFoundation: boolean;
};

function readRuntimeModulesTableView(query: PhiTableProviderQueryRequest["query"]) {
  const filters = { ...(query.filters ?? {}) };
  const areaValue = filters[PHI_BUILDER_MODULES_TABLE_FILTER_KEYS.area];
  const showFoundationValue = filters[PHI_BUILDER_MODULES_TABLE_FILTER_KEYS.showFoundation];
  delete filters[PHI_BUILDER_MODULES_TABLE_FILTER_KEYS.area];
  delete filters[PHI_BUILDER_MODULES_TABLE_FILTER_KEYS.showFoundation];
  return {
    view: {
      areaFilter: typeof areaValue === "string" && isPhiCmsAreaKey(areaValue) ? areaValue : null,
      showFoundation: showFoundationValue === true,
    } satisfies PhiRuntimeModulesTableView,
    query: { ...query, filters },
  };
}

function resolveModuleBaseAreaKey(moduleId: string): PhiCmsAreaKey | null {
  for (const areaKey of PHI_CMS_AREA_KEYS) {
    if (resolvePhiRuntimeAreaDefinition(areaKey).baseModuleId === moduleId) {
      return areaKey;
    }
  }
  return null;
}

function buildRuntimeModuleRows(
  state: PhiDeveloperBuilderWorkspaceState,
  categoryLabels: Record<string, string> | null,
  view: PhiRuntimeModulesTableView,
) {
  return state.runtimeModuleDefinitions
    .filter((definition) =>
      definition.kind !== "platform" &&
      (view.areaFilter == null || definition.eligibleAreas.includes(view.areaFilter)) &&
      (view.showFoundation || readPhiRuntimeModuleCategory(definition.category) !== "foundation"))
    .map((definition) => {
      const baseAreaKey = resolveModuleBaseAreaKey(definition.moduleId);
      const activeAreas = PHI_CMS_AREA_KEYS.filter((areaKey) =>
        definition.eligibleAreas.includes(areaKey) &&
        (areaKey === baseAreaKey || isModuleActiveInArea(state, definition.moduleId, areaKey)));
      return {
        moduleId: definition.moduleId,
        // "Runs anywhere": a base Module always does (its own Area never lets go of it), which is
        // exactly why its switch is locked -- the checkboxes carry the per-Area choice that remains.
        active: activeAreas.length > 0,
        locked: baseAreaKey != null,
        icon: definition.icon ?? (definition.iconFamily ? `@phis/ui/widgets:${definition.iconFamily}` : ""),
        title: definition.title,
        description: definition.description,
        category: categoryLabels?.[readPhiRuntimeModuleCategory(definition.category)] ?? definition.category,
        isBaseModule: baseAreaKey != null,
        baseAreaKey,
        ...Object.fromEntries(PHI_CMS_AREA_KEYS.map((areaKey) => [
          `area_${areaKey}`,
          definition.eligibleAreas.includes(areaKey) ? activeAreas.includes(areaKey) : null,
        ])),
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

  const baseAreaKey = resolveModuleBaseAreaKey(definition.moduleId);
  const activeAreas = PHI_CMS_AREA_KEYS.filter((areaKey) =>
    definition.eligibleAreas.includes(areaKey) &&
    (areaKey === baseAreaKey || isModuleActiveInArea(state, definition.moduleId, areaKey)));
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
    { key: "baseModule", label: label("baseModule", "Area Base module"), value: yesNo(baseAreaKey != null) },
    {
      key: "activeAreas",
      label: label("activeAreas", "Active areas"),
      value: activeAreas.map((areaKey) => areaLabels?.[areaKey] ?? areaKey).join(", ") || "–",
    },
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
    const publicRoutesResourceDescriptor = resources.find(
      (resource) => resource.resourceKey === PUBLIC_ROUTES_RESOURCE_KEY,
    );
    if (!resourceDescriptor || !detailResourceDescriptor || !publicRoutesResourceDescriptor) {
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
      if (request.resourceKey === PUBLIC_ROUTES_RESOURCE_KEY) {
        return queryPhiStaticTableResource(
          {
            descriptor: publicRoutesResourceDescriptor,
            rows: (builderState.publicRouteCollisionRequest?.answers ?? []).map((answer) => ({ ...answer })),
          },
          request,
        );
      }
      if (request.resourceKey !== RESOURCE_KEY) {
        throw new Error("Unknown Runtime Modules Table resource.");
      }
      /*
       * The two view filters are read here rather than left to the generic row matcher: neither is a
       * field on a row -- one asks about eligibility, the other inverts a category -- and both are
       * dropped from the query so the matcher does not look for columns that do not exist.
       */
      const { view, query: filteredQuery } = readRuntimeModulesTableView(request.query);
      return queryPhiStaticTableResource(
        {
          descriptor: resourceDescriptor,
          rows: buildRuntimeModuleRows(builderState, readLabelMap(request.params, "categoryLabels"), view),
        },
        { ...request, query: filteredQuery },
      );
    };

    const mutate = async (
      request: PhiTableProviderMutationRequest,
    ): Promise<PhiTableProviderMutationResult> => {
      if (request.resourceKey === PUBLIC_ROUTES_RESOURCE_KEY) {
        if (request.kind !== "field" || request.fieldKey !== "path") {
          return { status: "rejected", invalidation: "none", errorCode: "unsupported-mutation" };
        }
        const path = typeof request.proposedValue === "string" ? request.proposedValue.trim() : "";
        answerPhiBuilderPublicRouteCollision("public", String(request.rowIdentity), path);
        return { status: "accepted", invalidation: "none", rowPatch: { path } };
      }
      if (request.resourceKey !== RESOURCE_KEY) {
        throw new Error("Unknown Runtime Modules Table resource.");
      }
      if (request.kind !== "field") {
        return { status: "rejected", invalidation: "none", errorCode: "unsupported-mutation" };
      }

      const moduleId = String(request.rowIdentity);
      const definition = builderState.runtimeModuleDefinitions.find((candidate) => candidate.moduleId === moduleId);
      if (!definition) {
        return { status: "rejected", invalidation: "none", errorCode: "not-found", message: "Module not found." };
      }
      const baseAreaKey = resolveModuleBaseAreaKey(moduleId);
      const proposedActive = request.proposedValue === true;

      /*
       * The one question a switch cannot answer by itself.
       *
       * Asked only when Public is among the Areas being turned on, because Public is the only address
       * space two Modules can contest. Nothing is applied while the question stands: a Module is active
       * with every route addressed or it is not active, so the switch springs back and the dialog is
       * what enables it.
       */
      const askAboutPublicAddresses = (cmsAreas: readonly PhiCmsAreaKey[]) => {
        if (!proposedActive || !cmsAreas.includes("public")) {
          return false;
        }
        const answers = resolvePhiBuilderPublicRouteCollisionAnswers(builderState, definition.moduleId);
        if (answers.length === 0) {
          return false;
        }
        openPhiBuilderPublicRouteCollisionRequest("public", {
          moduleId: definition.moduleId,
          moduleTitle: definition.title,
          areas: cmsAreas.filter((areaKey): areaKey is PhiCmsAreaKey & PhiDeveloperBuilderArea =>
            isPhiBuilderAreaKey(areaKey)),
          answers,
        });
        return true;
      };

      const applyAreaChange = (cmsAreas: readonly PhiCmsAreaKey[]) => {
        const changes = cmsAreas
          .filter((areaKey): areaKey is PhiCmsAreaKey & PhiDeveloperBuilderArea => isPhiBuilderAreaKey(areaKey))
          .map((areaKey) => {
            const currentModuleIds = builderState.runtimeModuleIdsByArea[areaKey] ?? [];
            return {
              area: areaKey,
              selectedIds: proposedActive
                ? [...currentModuleIds, definition.moduleId]
                : currentModuleIds.filter((candidateId) => candidateId !== definition.moduleId),
            };
          });
        applyPhiBuilderRuntimeModuleSelectionChanges(changes, "public");
      };

      // The row's switch: the Module as a whole, i.e. every eligible Area in one gesture.
      if (request.fieldKey === "active") {
        if (baseAreaKey != null) {
          return {
            status: "rejected",
            invalidation: "none",
            errorCode: "locked",
            message: `"${definition.title}" is Area "${baseAreaKey}"'s Base module and always runs there.`,
          };
        }
        if (askAboutPublicAddresses(definition.eligibleAreas)) {
          return { status: "rejected", invalidation: "none", errorCode: "public-address-taken" };
        }
        try {
          applyAreaChange(definition.eligibleAreas);
        } catch (error) {
          return {
            status: "rejected",
            invalidation: "none",
            errorCode: "invalid-selection",
            message: error instanceof Error ? error.message : "Invalid Module selection.",
          };
        }
        return { status: "accepted", invalidation: "view", rowPatch: { active: proposedActive } };
      }

      // An area_* checkbox: one Area's own choice.
      const areaKey = request.fieldKey.startsWith("area_") ? request.fieldKey.slice("area_".length) : null;
      if (!areaKey || !isPhiCmsAreaKey(areaKey)) {
        return { status: "rejected", invalidation: "none", errorCode: "unsupported-mutation" };
      }
      if (areaKey === baseAreaKey) {
        return {
          status: "rejected",
          invalidation: "none",
          errorCode: "locked",
          message: `"${definition.title}" is this Area's Base module and is always active there.`,
        };
      }
      if (!definition.eligibleAreas.includes(areaKey)) {
        return {
          status: "rejected",
          invalidation: "none",
          errorCode: "ineligible",
          message: `"${definition.title}" is not eligible for Area "${areaKey}".`,
        };
      }
      if (askAboutPublicAddresses([areaKey])) {
        return { status: "rejected", invalidation: "none", errorCode: "public-address-taken" };
      }
      try {
        applyAreaChange([areaKey]);
      } catch (error) {
        return {
          status: "rejected",
          invalidation: "none",
          errorCode: "invalid-selection",
          message: error instanceof Error ? error.message : "Invalid Module selection.",
        };
      }
      return { status: "accepted", invalidation: "view", rowPatch: { [request.fieldKey]: proposedActive } };
    };

    return {
      key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.runtimeModulesTable,
      resources: [resourceDescriptor, detailResourceDescriptor, publicRoutesResourceDescriptor],
      query,
      mutate,
    };
  }, [builderState]);

  return <PhiTableProviderClient registration={registration}>{children}</PhiTableProviderClient>;
}
