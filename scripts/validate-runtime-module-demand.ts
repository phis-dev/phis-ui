import assert from "node:assert/strict";

import type { PhiResolvedCmsRenderableTree } from "../types/cms";
import type { ReactNode } from "react";
import type {
  PhiRuntimeControllerDefinition,
  PhiRuntimeModule,
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
  PhiRuntimeModuleId,
} from "../types/cms-plugins";
import type { PhiRuntimeModuleFormDefinition } from "../components/forms/form-registry";
import type { PhiCmsAreaDefinition } from "../types/cms-module-descriptors";
import type { PhiFormId } from "../types/form-id";
import { PhiCmsWidgetType } from "../constants/cms-widget-types";
import { createPhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import {
  collectPhiRuntimeDataProviderKeys,
  resolvePhiRuntimeControllerDefinitions,
  resolvePhiRuntimeModuleSet,
  resolvePhiRuntimeRenderRegistry,
} from "../plugins/runtime-modules/resolver";
import { resolvePhiRuntimeModuleServerBinding } from "../plugins/runtime-modules/server-capabilities";

const PLATFORM_MODULE_ID = "@test/pkg/modules/platform" as PhiRuntimeModuleId;
const BASE_MODULE_ID = "@test/pkg/modules/base" as PhiRuntimeModuleId;
const PROVIDER_MODULE_ID = "@test/pkg/modules/provider" as PhiRuntimeModuleId;
const CONTROLLER_MODULE_ID = "@test/pkg/modules/controller" as PhiRuntimeModuleId;
const CONTROLLERLESS_MODULE_ID = "@test/pkg/modules/controllerless" as PhiRuntimeModuleId;
const BUILDER_BASE_MODULE_ID = "@test/pkg/modules/builder-base" as PhiRuntimeModuleId;
const INACTIVE_MODULE_ID = "@test/pkg/modules/inactive" as PhiRuntimeModuleId;
const FORM_OWNER_MODULE_ID = "@test/pkg/modules/form-owner" as PhiRuntimeModuleId;
const PROVIDER_KEY = "@test/options/items" as const;
const TABLE_PROVIDER_KEY = "@test/tables/items" as const;
const CALENDAR_ADAPTER_KEY = "@test/pkg/modules/controllerless/calendars/gregory" as const;
const WIDGET_TYPE = "@test/pkg/modules/widget";
const INACTIVE_WIDGET_TYPE = "@test/pkg/modules/inactive-widget";
const TEST_FORM_ID = "@test/pkg/modules/form-owner/forms/example" as PhiFormId;
const TEST_FORM_FIELD_PROVIDER_KEY = "@test/forms/text" as const;

const loads = new Map<PhiRuntimeModuleId, number>();
const widgetLoads = new Map<string, number>();
let formUiProviderLoads = 0;

function TestFormUiProvider({ children }: { children: ReactNode }) {
  return children;
}

function createControllerDefinition(key: string): PhiRuntimeControllerDefinition<Record<string, never>> {
  return {
    kind: "controller",
    pluginKey: "@test",
    key,
    title: key,
    allowedMountScopes: ["area"],
    runtimeSignals: { emits: [], listens: [] },
    defaultConfig: {},
    parseConfig: () => ({}),
  };
}

function createModuleDefinition(
  moduleId: PhiRuntimeModuleId,
  controllerKey: string,
  dataProviders?: PhiRuntimeModuleDefinition["dataProviders"],
): PhiRuntimeModuleDefinition {
  return {
    moduleId,
    kind: moduleId === PLATFORM_MODULE_ID ? "platform" : "module",
    eligibleAreas: ["public"],
    serverBinding: {
      providerId: "@phis/server/core",
      requiredCapabilities: [],
    },
    controllerType: `@test/${controllerKey}`,
    controller: {
      pluginKey: "@test",
      key: controllerKey,
      title: controllerKey,
      allowedMountScopes: ["area"],
      runtimeSignals: { emits: [], listens: [] },
    },
    title: moduleId,
    description: `Test runtime module ${moduleId}.`,
    category: "test",
    iconFamily: "test",
    controllerMountPolicy: "demand",
    dataProviders,
  };
}

function createWidgetPlugin(widgetType: string, mode: "runtime" | "preview") {
  const key = `${widgetType}:${mode}`;
  const separatorIndex = widgetType.lastIndexOf("/");
  widgetLoads.set(key, (widgetLoads.get(key) ?? 0) + 1);
  return {
    kind: "widget" as const,
    pluginKey: widgetType.slice(0, separatorIndex),
    typeKey: widgetType.slice(separatorIndex + 1),
    title: "Widget",
    category: "developer" as const,
    fields: [],
    parseConfig: (raw: Record<string, unknown>) => raw,
    render: () => null,
    renderPreview: () => null,
  };
}

function createEntry({
  definition,
  controllerDefinition,
  widgetType,
  widgetTypes,
  forms,
  loadUiProvider,
}: {
  definition: PhiRuntimeModuleDefinition;
  controllerDefinition?: PhiRuntimeControllerDefinition<Record<string, never>>;
  widgetType?: string;
  widgetTypes?: readonly string[];
  forms?: readonly PhiRuntimeModuleFormDefinition[];
  loadUiProvider?: PhiRuntimeModuleCatalogEntry["loadUiProvider"];
}): PhiRuntimeModuleCatalogEntry {
  const runtimeModule: PhiRuntimeModule = controllerDefinition
    ? { ...definition, controllerDefinition }
    : definition;
  return {
    definition,
    widgets: (widgetTypes ?? (widgetType ? [widgetType] : [])).map((type) => {
      const separatorIndex = type.lastIndexOf("/");
      return {
        ownerModuleId: definition.moduleId,
        definition: {
          kind: "widget",
          pluginKey: type.slice(0, separatorIndex),
          typeKey: type.slice(separatorIndex + 1),
          title: "Widget",
          category: "developer",
          fields: [],
          defaultConfig: {},
          parseConfig: (raw) => raw,
        },
        renderPolicies: { runtime: "custom", preview: "custom", authoring: "usePreview" },
        loadRuntime: async () => createWidgetPlugin(type, "runtime"),
        loadPreview: async () => createWidgetPlugin(type, "preview"),
      };
    }),
    layouts: [],
    forms,
    loadUiProvider,
    load: async () => {
      loads.set(definition.moduleId, (loads.get(definition.moduleId) ?? 0) + 1);
      return runtimeModule;
    },
  };
}

const platformController = createControllerDefinition("platform");
const baseController = createControllerDefinition("base");
const providerController = createControllerDefinition("provider");
const demandController = createControllerDefinition("controller");
const platformDefinition = createModuleDefinition(PLATFORM_MODULE_ID, "platform");
const baseDefinition = createModuleDefinition(BASE_MODULE_ID, "base");
const providerModuleDefinition = createModuleDefinition(PROVIDER_MODULE_ID, "provider", [{
  key: PROVIDER_KEY,
  ownerModuleId: PROVIDER_MODULE_ID,
  kind: "options",
  executionMode: "live",
  authoringMode: "none",
  title: "Items",
}, {
  key: TABLE_PROVIDER_KEY,
  ownerModuleId: PROVIDER_MODULE_ID,
  kind: "table",
  executionMode: "live",
  authoringMode: "none",
  title: "Item table",
  resources: [{
    resourceKey: "items",
    title: "Items",
    rowIdentityPath: "id",
    fields: [
      { key: "id", title: "ID", type: "string", required: true },
      { key: "choice", title: "Choice", type: "enum", optionsProvider: { providerKey: PROVIDER_KEY } },
    ],
    query: { sorting: "none", pagination: "none" },
  }],
}]);
const controllerModuleDefinition = createModuleDefinition(CONTROLLER_MODULE_ID, "controller");
const controllerlessModuleDefinition = {
  moduleId: CONTROLLERLESS_MODULE_ID,
  kind: "module",
  eligibleAreas: ["public"],
  serverBinding: {
    providerId: "@phis/server/core",
    requiredCapabilities: [],
  },
  title: "Controllerless adapter",
  description: "Controllerless Calendar adapter test module.",
  category: "test",
  iconFamily: "test",
  calendarAdapters: [{
    key: CALENDAR_ADAPTER_KEY,
    ownerModuleId: CONTROLLERLESS_MODULE_ID,
    calendarSystem: "gregory",
    title: "Gregorian",
    capabilities: {
      date: true,
      week: true,
      month: true,
      quarter: true,
      year: true,
      time: true,
      range: true,
    },
  }],
} as const satisfies PhiRuntimeModuleDefinition;
const builderBaseDefinition = {
  ...createModuleDefinition(BUILDER_BASE_MODULE_ID, "builder-base"),
  eligibleAreas: ["builder"] as const,
};
const inactiveModuleDefinition = createModuleDefinition(INACTIVE_MODULE_ID, "inactive");
const formOwnerModuleDefinition = {
  ...createModuleDefinition(FORM_OWNER_MODULE_ID, "form-owner"),
  formProviders: {
    fieldTypes: [{
      key: TEST_FORM_FIELD_PROVIDER_KEY,
      ownerModuleId: FORM_OWNER_MODULE_ID,
      title: "Test text field",
      valueType: "string",
      presentation: "control",
    }],
  },
} as const satisfies PhiRuntimeModuleDefinition;
const testFormDefinition: PhiRuntimeModuleFormDefinition = {
  ownerModuleId: FORM_OWNER_MODULE_ID,
  formId: TEST_FORM_ID,
  version: 1,
  flags: 0,
  title: "Example Form",
  description: null,
  category: "test",
  tags: [],
  descriptor: {
    schemaVersion: 1,
    key: TEST_FORM_ID,
    fields: [{
      key: "item",
      fieldProviderKey: TEST_FORM_FIELD_PROVIDER_KEY,
      optionsProvider: { providerKey: PROVIDER_KEY },
    }],
  },
  submitHandlerKey: "",
  confirmHandlerKey: null,
  previewHandlerKey: null,
  defaultConfig: {},
  variant: null,
  config: {},
  previewUpstreamPath: null,
};

assert.throws(
  () => createPhiRuntimeModuleCatalog([
    createEntry({
      definition: {
        ...createModuleDefinition("@test/pkg/modules/invalid-description", "invalid-description"),
        description: " ",
      },
      controllerDefinition: createControllerDefinition("invalid-description"),
    }),
  ], []),
  /description must be a non-empty string/,
);

assert.throws(
  () => createPhiRuntimeModuleCatalog([
    createEntry({
      definition: {
        ...createModuleDefinition("@test/pkg/modules/invalid-icon", "invalid-icon"),
        iconFamily: " ",
      },
      controllerDefinition: createControllerDefinition("invalid-icon"),
    }),
  ], []),
  /icon or iconFamily must be a non-empty string/,
);

const areaDefinitions: readonly PhiCmsAreaDefinition[] = [{
  area: "public",
  baseModuleId: BASE_MODULE_ID,
  shellPresetKey: "public-shell",
  accessPolicy: { access: "anyone" },
  navigationSurfaces: [],
}, {
  area: "builder",
  baseModuleId: BUILDER_BASE_MODULE_ID,
  shellPresetKey: "builder-shell",
  accessPolicy: { access: "anyone" },
  navigationSurfaces: [],
}];
const catalog = createPhiRuntimeModuleCatalog([
  createEntry({ definition: platformDefinition, controllerDefinition: platformController }),
  createEntry({
    definition: baseDefinition,
    controllerDefinition: baseController,
    widgetTypes: [WIDGET_TYPE, PhiCmsWidgetType.Form],
  }),
  createEntry({
    definition: providerModuleDefinition,
    controllerDefinition: providerController,
  }),
  createEntry({ definition: controllerModuleDefinition, controllerDefinition: demandController }),
  createEntry({ definition: controllerlessModuleDefinition }),
  createEntry({
    definition: builderBaseDefinition,
    controllerDefinition: createControllerDefinition("builder-base"),
  }),
  createEntry({
    definition: inactiveModuleDefinition,
    controllerDefinition: createControllerDefinition("inactive"),
    widgetType: INACTIVE_WIDGET_TYPE,
  }),
  createEntry({
    definition: formOwnerModuleDefinition,
    forms: [testFormDefinition],
    loadUiProvider: async () => {
      formUiProviderLoads += 1;
      return TestFormUiProvider;
    },
  }),
], areaDefinitions);

const moduleSet = await resolvePhiRuntimeModuleSet({
  catalog,
  area: "public",
  moduleIds: [PROVIDER_MODULE_ID, CONTROLLER_MODULE_ID, CONTROLLERLESS_MODULE_ID, FORM_OWNER_MODULE_ID],
});
assert.deepEqual([...loads], [], "metadata resolution must not load executable modules");
assert.deepEqual(
  [...moduleSet.activeModuleIds],
  [
    PLATFORM_MODULE_ID,
    BASE_MODULE_ID,
    PROVIDER_MODULE_ID,
    CONTROLLER_MODULE_ID,
    CONTROLLERLESS_MODULE_ID,
    FORM_OWNER_MODULE_ID,
  ],
  "a target Area must contain only Platform, its own base, and selected optional modules",
);
assert.equal(moduleSet.activeModuleIds.has(BUILDER_BASE_MODULE_ID), false);
assert.equal(moduleSet.calendarAdapterDescriptorsByKey.get(CALENDAR_ADAPTER_KEY)?.ownerModuleId,
  CONTROLLERLESS_MODULE_ID);
assert.equal(moduleSet.ownerModuleIdByControllerType.has(CONTROLLERLESS_MODULE_ID), false);
assert.equal(loads.get(CONTROLLERLESS_MODULE_ID), undefined,
  "controllerless metadata resolution must not load the executable module");

const builderModuleSet = await resolvePhiRuntimeModuleSet({
  catalog,
  area: "builder",
  moduleIds: [],
});
assert.deepEqual(
  [...builderModuleSet.activeModuleIds],
  [PLATFORM_MODULE_ID, BUILDER_BASE_MODULE_ID],
  "the Builder Area must not inherit target-Area base modules",
);

const emptyTree = { contentWidgets: [], layoutNodes: [] } as unknown as PhiResolvedCmsRenderableTree;
await resolvePhiRuntimeRenderRegistry({
  catalog,
  moduleSet,
  trees: [emptyTree],
  serverCapabilities: null,
});
assert.deepEqual([...loads], [], "an empty tree must not load executable modules");
assert.equal(formUiProviderLoads, 0, "an unused Form must not load its owner UI provider");

const formTree = {
  contentWidgets: [{
    widgetType: PhiCmsWidgetType.Form,
    config: { formId: TEST_FORM_ID },
  }],
  layoutNodes: [],
} as unknown as PhiResolvedCmsRenderableTree;
const formRegistry = await resolvePhiRuntimeRenderRegistry({
  catalog,
  moduleSet,
  trees: [formTree],
  serverCapabilities: null,
});
assert.equal(formUiProviderLoads, 1, "a referenced Form must load its owner UI provider");
assert.equal(formRegistry.uiProvidersByModuleId.get(FORM_OWNER_MODULE_ID), TestFormUiProvider);
assert.deepEqual(
  [...formRegistry.dataProviderDescriptorsByKey.keys()],
  [PROVIDER_KEY],
  "a referenced Form must demand Options Providers declared by its field descriptors",
);

const inactiveWidgetTree = {
  contentWidgets: [{ widgetType: INACTIVE_WIDGET_TYPE, config: {} }],
  layoutNodes: [],
} as unknown as PhiResolvedCmsRenderableTree;
const originalWarn = console.warn;
console.warn = () => undefined;
const inactiveWidgetRegistry = await resolvePhiRuntimeRenderRegistry({
  catalog,
  moduleSet,
  trees: [inactiveWidgetTree],
  serverCapabilities: null,
}).finally(() => {
  console.warn = originalWarn;
});
assert.deepEqual(inactiveWidgetRegistry.renderIssuesByWidgetType.get(INACTIVE_WIDGET_TYPE), {
  code: "missing-module",
  kind: "widget",
  type: INACTIVE_WIDGET_TYPE,
  moduleId: INACTIVE_MODULE_ID,
  detail: `Installed owner module "${INACTIVE_MODULE_ID}" is not active.`,
});
assert.equal(loads.get(INACTIVE_MODULE_ID), undefined, "a missing-module fallback must not load its owner");

const providerTree = {
  contentWidgets: [{
    widgetType: WIDGET_TYPE,
    config: { optionsProvider: { providerKey: PROVIDER_KEY } },
  }],
  layoutNodes: [],
} as unknown as PhiResolvedCmsRenderableTree;
const providerDependencyTree = {
  contentWidgets: [{
    widgetType: WIDGET_TYPE,
    config: { source: { providerKey: TABLE_PROVIDER_KEY, resourceKey: "items" } },
  }],
  layoutNodes: [],
} as unknown as PhiResolvedCmsRenderableTree;
assert.deepEqual(
  [...collectPhiRuntimeDataProviderKeys({ moduleSet, trees: [providerDependencyTree] })],
  [TABLE_PROVIDER_KEY, PROVIDER_KEY],
  "a demanded Table Provider must transitively demand Options Providers declared by its resource schema",
);
const registry = await resolvePhiRuntimeRenderRegistry({
  catalog,
  moduleSet,
  trees: [providerTree],
  serverCapabilities: null,
});
assert.equal(
  loads.get(BASE_MODULE_ID),
  undefined,
  "a rendered widget must load its per-type renderer without loading its module object",
);
assert.equal(
  loads.get(PROVIDER_MODULE_ID),
  undefined,
  "a referenced data provider must resolve from server-safe descriptors without loading its module",
);
assert.equal(loads.get(PLATFORM_MODULE_ID), undefined, "the active Platform module must stay metadata-only");
assert.equal(loads.get(CONTROLLER_MODULE_ID), undefined, "an unused demand controller must stay unloaded");
assert.deepEqual([...registry.dataProviderDescriptorsByKey.keys()], [PROVIDER_KEY]);
assert.equal(widgetLoads.get(`${WIDGET_TYPE}:runtime`), 1);
assert.equal(widgetLoads.get(`${WIDGET_TYPE}:preview`), undefined);

const previewTree = {
  contentWidgets: [{
    widgetType: WIDGET_TYPE,
    config: { renderMode: "preview" },
  }],
  layoutNodes: [],
} as unknown as PhiResolvedCmsRenderableTree;
await resolvePhiRuntimeRenderRegistry({
  catalog,
  moduleSet,
  trees: [previewTree],
  serverCapabilities: null,
});
assert.equal(widgetLoads.get(`${WIDGET_TYPE}:runtime`), 1);
assert.equal(widgetLoads.get(`${WIDGET_TYPE}:preview`), 1);

const controllerDefinitions = await resolvePhiRuntimeControllerDefinitions({
  catalog,
  moduleSet,
  settings: [{
    type: controllerModuleDefinition.controllerType!,
    instanceKey: "default",
    mountScope: "area",
    enabled: true,
  }],
});
assert.equal(loads.get(CONTROLLER_MODULE_ID), 1, "a materialized controller must load its owner module");
assert.equal(controllerDefinitions.get(controllerModuleDefinition.controllerType!), demandController);

const requiredCapability = "@test/pkg/modules/server/items:v1" as const;
const requiredBinding = {
  providerId: "@test/pkg/modules/server",
  requiredCapabilities: [requiredCapability],
} as const;
assert.deepEqual(
  resolvePhiRuntimeModuleServerBinding(requiredBinding, null),
  {
    available: false,
    state: "unavailable",
    diagnosticCode: "capability_snapshot_unavailable",
    missingCapabilities: [requiredCapability],
  },
);
assert.deepEqual(
  resolvePhiRuntimeModuleServerBinding(requiredBinding, {
    siteKey: "test",
    releaseBuildId: null,
    buildManifestDigest: "test",
    providers: [{
      providerId: "@test/pkg/modules/server",
      state: "available",
      diagnosticCode: null,
      capabilities: [{ id: requiredCapability, interfaceDigest: "test" }],
    }],
  }),
  { available: true },
);

console.log("Runtime module demand contracts valid.");
