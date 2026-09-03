import type { PhiResolvedCmsRenderableTree } from "../../types/cms";
import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiCmsRenderIssue, PhiRuntimeControllerSetting } from "../../types/cms-plugins";
import type { PhiRuntimeDataProviderKey } from "../../types/runtime-data-provider";
import type { PhiCalendarAdapterKey } from "../../types/calendar";
import type { PhiFormProviderKey } from "../../types/form-descriptor";
import type { PhiCapabilitySnapshot } from "../../types/server-capabilities";
import { splitPhiCmsLayoutNamespacedTypeKey } from "../../constants/cms-layout-types";
import { PHI_RUNTIME_FORM_CONTROLLER_DEFINITION } from "../../components/forms/runtime-form-controller-definition";
import { PHI_FORM_CONTROLLER_TYPE } from "../../components/forms/runtime-form-controller-address";
import {
  assertPhiRuntimeModule,
  buildPhiRuntimeModuleLayoutType,
  buildPhiRuntimeModuleControllerDescriptor,
  buildPhiRuntimeModuleWidgetType,
  hasPhiRuntimeModuleController,
  type PhiResolvedRuntimeModuleSet,
  type PhiResolvedRuntimeRenderRegistry,
  type PhiRuntimeModule,
  type PhiRuntimeModuleCatalog,
  type PhiRuntimeModuleCatalogEntry,
  type PhiRuntimeModuleDefinition,
  type PhiRuntimeModuleId,
  type PhiRuntimeModuleLayoutDefinition,
  type PhiRuntimeModuleWidgetDefinition,
  type PhiCmsPreviewWidgetPlugin,
  type PhiCmsRuntimeWidgetPlugin,
} from "./contracts";
import {
  readPhiRuntimeTreeRenderMode,
  resolvePhiRuntimeWidgetImplementationMode,
  type PhiRuntimeWidgetImplementationMode,
} from "./render-mode";
import { resolvePhiRuntimeModuleServerBinding } from "./server-capabilities";
import {
  PHI_VIEWER_ACCESS_ANYONE,
  type PhiRoleProviderId,
} from "../../types/access";
import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import { parsePhiFormWidgetConfig } from "./core/widgets/form/config";

function loadRuntimeWidgetPlugin(entry: PhiRuntimeModuleWidgetDefinition) {
  return entry.loadRuntime();
}

function loadPreviewWidgetPlugin(entry: PhiRuntimeModuleWidgetDefinition) {
  return entry.loadPreview();
}

function loadLayoutPlugin(entry: PhiRuntimeModuleLayoutDefinition) {
  return entry.loadRuntime();
}

function loadUiProvider(catalogEntry: PhiRuntimeModuleCatalogEntry) {
  const loader = catalogEntry.loadUiProvider;
  if (!loader) {
    return null;
  }
  return loader();
}

function loadModule(
  catalog: PhiRuntimeModuleCatalog,
  moduleId: PhiRuntimeModuleId,
) {
  const catalogEntry = catalog.get(moduleId);
  if (!catalogEntry) {
    throw new Error(`Runtime module "${moduleId}" is not installed.`);
  }
  if (catalogEntry.definition.moduleId !== moduleId) {
    throw new Error(`Runtime module catalog key "${moduleId}" does not match its definition.`);
  }
  const loader = catalogEntry.load;

  return loader().then((runtimeModule) => {
    assertPhiRuntimeModule(runtimeModule);
    if (runtimeModule.moduleId !== moduleId) {
      throw new Error(
        `Runtime module loader for "${moduleId}" returned "${runtimeModule.moduleId}".`,
      );
    }
    if (
      runtimeModule.controllerType !== catalogEntry.definition.controllerType ||
      runtimeModule.kind !== catalogEntry.definition.kind ||
      runtimeModule.controllerMountPolicy !== catalogEntry.definition.controllerMountPolicy ||
      JSON.stringify(runtimeModule.serverBinding) !==
        JSON.stringify(catalogEntry.definition.serverBinding)
    ) {
      throw new Error(
        `Runtime module "${moduleId}" does not match its catalog definition.`,
      );
    }
    if (hasPhiRuntimeModuleController(runtimeModule)) {
      const controllerDefinition = runtimeModule.controllerDefinition!;
      const controllerType = `${controllerDefinition.pluginKey}/${controllerDefinition.key}`;
      if (controllerType !== catalogEntry.definition.controllerType) {
        throw new Error(
          `Runtime module "${moduleId}" controller implementation does not match its catalog descriptor.`,
        );
      }
      if (
        JSON.stringify(buildPhiRuntimeModuleControllerDescriptor(controllerDefinition)) !==
        JSON.stringify(catalogEntry.definition.controller)
      ) {
        throw new Error(
          `Runtime module "${moduleId}" controller metadata does not match its catalog descriptor.`,
        );
      }
    }
    if (
      JSON.stringify(runtimeModule.dataProviders ?? []) !==
      JSON.stringify(catalogEntry.definition.dataProviders ?? [])
    ) {
      throw new Error(
        `Runtime module "${moduleId}" data provider descriptors do not match its catalog definition.`,
      );
    }
    if (
      JSON.stringify(runtimeModule.calendarAdapters ?? []) !==
      JSON.stringify(catalogEntry.definition.calendarAdapters ?? [])
    ) {
      throw new Error(
        `Runtime module "${moduleId}" Calendar adapter descriptors do not match its catalog definition.`,
      );
    }
    return runtimeModule;
  });
}

export async function resolvePhiRuntimeModuleSet({
  catalog,
  moduleIds,
  area,
  serverCapabilities = null,
}: {
  catalog: PhiRuntimeModuleCatalog;
  moduleIds?: readonly PhiRuntimeModuleId[] | null;
  area?: PhiCmsAreaKey;
  serverCapabilities?: PhiCapabilitySnapshot | null;
}): Promise<PhiResolvedRuntimeModuleSet> {
  const platformModuleId = catalog.platformModuleId;
  if (!platformModuleId) {
    throw new Error("Runtime module catalog has no Platform contribution.");
  }
  const installedOwnerModuleIdByWidgetType = new Map<string, PhiRuntimeModuleId>();
  const installedOwnerModuleIdByLayoutType = new Map<string, PhiRuntimeModuleId>();
  for (const [moduleId, entry] of catalog) {
    for (const widget of entry.widgets) {
      const type = buildPhiRuntimeModuleWidgetType(widget);
      installedOwnerModuleIdByWidgetType.set(type, moduleId);
    }
    for (const layout of entry.layouts) {
      const type = buildPhiRuntimeModuleLayoutType(layout);
      installedOwnerModuleIdByLayoutType.set(type, moduleId);
    }
  }
  const activeModuleIds = new Set<PhiRuntimeModuleId>([platformModuleId]);
  if (area) {
    const areaDefinition = catalog.areaDefinitions.find((definition) => definition.area === area);
    if (!areaDefinition) {
      throw new Error(`Area "${area}" is not declared in the runtime module catalog.`);
    }
    activeModuleIds.add(areaDefinition.baseModuleId);
  }
  const selectedModuleIds = moduleIds ?? [];
  const unavailableModuleBindings = new Map<
    PhiRuntimeModuleId,
    ReturnType<typeof resolvePhiRuntimeModuleServerBinding>
  >();
  const baseModuleIds = new Set(catalog.areaDefinitions.map(({ baseModuleId }) => baseModuleId));
  if (new Set(selectedModuleIds).size !== selectedModuleIds.length) {
    throw new Error("Area runtimeModules must not contain duplicate module ids.");
  }
  for (const moduleId of selectedModuleIds) {
    const catalogEntry = catalog.get(moduleId);
    if (!catalogEntry) {
      throw new Error(`Runtime module "${moduleId}" is not installed.`);
    }
    if (area && !catalogEntry.definition.eligibleAreas.includes(area)) {
      throw new Error(`Runtime module "${moduleId}" is not eligible for Area "${area}".`);
    }
    if (catalogEntry.definition.kind === "platform" || baseModuleIds.has(moduleId)) {
      throw new Error(
        `Locked runtime module "${moduleId}" must not be selected in Area runtimeModules.`,
      );
    }
    const bindingResolution = resolvePhiRuntimeModuleServerBinding(
      catalogEntry.definition.serverBinding,
      serverCapabilities,
    );
    if (!bindingResolution.available) {
      unavailableModuleBindings.set(moduleId, bindingResolution);
      continue;
    }
    activeModuleIds.add(moduleId);
  }

  const moduleDefinitionsById = new Map<PhiRuntimeModuleId, PhiRuntimeModuleDefinition>();
  const widgetDefinitionsByType = new Map<string, PhiResolvedRuntimeModuleSet["widgetDefinitionsByType"] extends ReadonlyMap<string, infer T> ? T : never>();
  const layoutDefinitionsByType = new Map<string, PhiResolvedRuntimeModuleSet["layoutDefinitionsByType"] extends ReadonlyMap<string, infer T> ? T : never>();
  const dataProviderDescriptorsByKey = new Map<
    PhiRuntimeDataProviderKey,
    PhiResolvedRuntimeModuleSet["dataProviderDescriptorsByKey"] extends ReadonlyMap<PhiRuntimeDataProviderKey, infer T>
      ? T
      : never
  >();
  const calendarAdapterDescriptorsByKey = new Map<
    PhiCalendarAdapterKey,
    PhiResolvedRuntimeModuleSet["calendarAdapterDescriptorsByKey"] extends ReadonlyMap<PhiCalendarAdapterKey, infer T>
      ? T
      : never
  >();
  const formFieldTypeProviderDescriptorsByKey = new Map<
    PhiFormProviderKey,
    PhiResolvedRuntimeModuleSet["formFieldTypeProviderDescriptorsByKey"] extends ReadonlyMap<PhiFormProviderKey, infer T>
      ? T
      : never
  >();
  const formValidationProviderDescriptorsByKey = new Map<
    PhiFormProviderKey,
    PhiResolvedRuntimeModuleSet["formValidationProviderDescriptorsByKey"] extends ReadonlyMap<PhiFormProviderKey, infer T>
      ? T
      : never
  >();
  const formHandlerProviderDescriptorsByKey = new Map<
    PhiFormProviderKey,
    PhiResolvedRuntimeModuleSet["formHandlerProviderDescriptorsByKey"] extends ReadonlyMap<PhiFormProviderKey, infer T>
      ? T
      : never
  >();
  const formHandlerProviderDescriptorsByPhaseAndHandlerKey = new Map<
    string,
    PhiResolvedRuntimeModuleSet["formHandlerProviderDescriptorsByKey"] extends ReadonlyMap<PhiFormProviderKey, infer T>
      ? T
      : never
  >();
  const formDefinitionsById = new Map<
    string,
    PhiResolvedRuntimeModuleSet["formDefinitionsById"] extends ReadonlyMap<string, infer T> ? T : never
  >();
  const controllerDescriptorsByType = new Map<string, PhiResolvedRuntimeModuleSet["controllerDescriptorsByType"] extends ReadonlyMap<string, infer T> ? T : never>([
    [PHI_FORM_CONTROLLER_TYPE, buildPhiRuntimeModuleControllerDescriptor(PHI_RUNTIME_FORM_CONTROLLER_DEFINITION)],
  ]);
  const ownerModuleIdByControllerType = new Map<string, PhiRuntimeModuleId>();
  const areaControllerSettings: PhiRuntimeControllerSetting[] = [];

  for (const moduleId of activeModuleIds) {
    const catalogEntry = catalog.get(moduleId)!;
    const definition = catalogEntry.definition;
    if (moduleDefinitionsById.has(moduleId)) {
      throw new Error(`Duplicate runtime module "${moduleId}".`);
    }
    moduleDefinitionsById.set(moduleId, definition);

    if (hasPhiRuntimeModuleController(definition)) {
      if (controllerDescriptorsByType.has(definition.controllerType)) {
        throw new Error(`Controller type "${definition.controllerType}" is owned by more than one module.`);
      }
      controllerDescriptorsByType.set(definition.controllerType, definition.controller);
      ownerModuleIdByControllerType.set(definition.controllerType, moduleId);
      if (definition.controllerMountPolicy === "area") {
        areaControllerSettings.push({
          type: definition.controllerType,
          instanceKey: "default",
          mountScope: "area",
          enabled: true,
        });
      }
    }

    for (const entry of catalogEntry.widgets) {
      const type = buildPhiRuntimeModuleWidgetType(entry);
      widgetDefinitionsByType.set(type, entry);
    }
    for (const entry of catalogEntry.layouts) {
      const type = buildPhiRuntimeModuleLayoutType(entry);
      layoutDefinitionsByType.set(type, entry);
    }

    for (const descriptor of definition.dataProviders ?? []) {
      if (dataProviderDescriptorsByKey.has(descriptor.key)) {
        throw new Error(`Data provider "${descriptor.key}" is owned by more than one runtime module.`);
      }
      dataProviderDescriptorsByKey.set(descriptor.key, descriptor);
    }
    for (const descriptor of definition.calendarAdapters ?? []) {
      if (calendarAdapterDescriptorsByKey.has(descriptor.key)) {
        throw new Error(`Calendar adapter "${descriptor.key}" is owned by more than one runtime module.`);
      }
      calendarAdapterDescriptorsByKey.set(descriptor.key, descriptor);
    }
    for (const descriptor of definition.formProviders?.fieldTypes ?? []) {
      if (formFieldTypeProviderDescriptorsByKey.has(descriptor.key)) {
        throw new Error(`Form field type provider "${descriptor.key}" is owned by more than one runtime module.`);
      }
      formFieldTypeProviderDescriptorsByKey.set(descriptor.key, descriptor);
    }
    for (const descriptor of definition.formProviders?.validationRules ?? []) {
      if (formValidationProviderDescriptorsByKey.has(descriptor.key)) {
        throw new Error(`Form validation provider "${descriptor.key}" is owned by more than one runtime module.`);
      }
      formValidationProviderDescriptorsByKey.set(descriptor.key, descriptor);
    }
    for (const descriptor of definition.formProviders?.handlers ?? []) {
      if (formHandlerProviderDescriptorsByKey.has(descriptor.key)) {
        throw new Error(`Form handler provider "${descriptor.key}" is owned by more than one runtime module.`);
      }
      formHandlerProviderDescriptorsByKey.set(descriptor.key, descriptor);
      const handlerIdentity = `${descriptor.phase}:${descriptor.handlerKey}`;
      if (formHandlerProviderDescriptorsByPhaseAndHandlerKey.has(handlerIdentity)) {
        throw new Error(
          `Form ${descriptor.phase} handler "${descriptor.handlerKey}" is declared by more than one active runtime module.`,
        );
      }
      formHandlerProviderDescriptorsByPhaseAndHandlerKey.set(handlerIdentity, descriptor);
    }
    for (const form of catalogEntry.forms ?? []) {
      if (formDefinitionsById.has(form.formId)) {
        throw new Error(`Form "${form.formId}" is owned by more than one active runtime module.`);
      }
      formDefinitionsById.set(form.formId, form);
    }
  }

  for (const form of formDefinitionsById.values()) {
    for (const field of form.descriptor.fields) {
      if (!formFieldTypeProviderDescriptorsByKey.has(field.fieldProviderKey)) {
        throw new Error(
          `Form "${form.formId}" requires unavailable field provider "${field.fieldProviderKey}".`,
        );
      }
      for (const rule of field.validation ?? []) {
        if (!formValidationProviderDescriptorsByKey.has(rule.providerKey)) {
          throw new Error(
            `Form "${form.formId}" requires unavailable validation provider "${rule.providerKey}".`,
          );
        }
      }
    }
    for (const [phase, handlerKey] of [
      ["submit", form.submitHandlerKey],
      ["confirm", form.confirmHandlerKey],
      ["preview", form.previewHandlerKey],
    ] as const) {
      if (
        handlerKey &&
        !formHandlerProviderDescriptorsByPhaseAndHandlerKey.has(`${phase}:${handlerKey}`)
      ) {
        throw new Error(
          `Form "${form.formId}" requires unavailable ${phase} handler "${handlerKey}".`,
        );
      }
    }
  }

  return {
    moduleDefinitionsById,
    widgetDefinitionsByType,
    layoutDefinitionsByType,
    dataProviderDescriptorsByKey,
    calendarAdapterDescriptorsByKey,
    formFieldTypeProviderDescriptorsByKey,
    formValidationProviderDescriptorsByKey,
    formHandlerProviderDescriptorsByKey,
    formDefinitionsById,
    controllerDescriptorsByType,
    activeModuleIds,
    unavailableModuleBindings,
    platformModuleId,
    installedOwnerModuleIdByWidgetType,
    installedOwnerModuleIdByLayoutType,
    ownerModuleIdByControllerType,
    areaControllerSettings,
  };
}

export async function resolvePhiRuntimeControllerDefinitions({
  catalog,
  moduleSet,
  settings,
}: {
  catalog: PhiRuntimeModuleCatalog;
  moduleSet: PhiResolvedRuntimeModuleSet;
  settings: readonly PhiRuntimeControllerSetting[];
}) {
  const controllerDefinitionsByType = new Map<string, NonNullable<PhiRuntimeModule["controllerDefinition"]>>([
    [PHI_FORM_CONTROLLER_TYPE, PHI_RUNTIME_FORM_CONTROLLER_DEFINITION],
  ]);
  const requiredModuleIds = new Set<PhiRuntimeModuleId>();

  for (const setting of settings) {
    if (!moduleSet.controllerDescriptorsByType.has(setting.type)) {
      throw new Error(`Runtime controller "${setting.type}" is not owned by an active module.`);
    }
    const moduleId = moduleSet.ownerModuleIdByControllerType.get(setting.type);
    if (moduleId) {
      requiredModuleIds.add(moduleId);
    }
  }

  const runtimeModules = await Promise.all(
    [...requiredModuleIds].map((moduleId) => loadModule(catalog, moduleId)),
  );
  for (const runtimeModule of runtimeModules) {
    if (!hasPhiRuntimeModuleController(runtimeModule) || !runtimeModule.controllerDefinition) {
      throw new Error(`Runtime module "${runtimeModule.moduleId}" does not provide a requested Controller.`);
    }
    controllerDefinitionsByType.set(
      runtimeModule.controllerType,
      runtimeModule.controllerDefinition,
    );
  }

  return controllerDefinitionsByType;
}

export function resolvePhiRuntimeModuleAuthoringDataProviderDescriptors({
  moduleSet,
}: {
  moduleSet: PhiResolvedRuntimeModuleSet;
}) {
  return [...moduleSet.dataProviderDescriptorsByKey.values()].filter(
    (descriptor) => descriptor.authoringMode !== "none",
  );
}

function collectTreeWidgetTypes(trees: readonly PhiResolvedCmsRenderableTree[]) {
  return new Set(trees.flatMap((tree) => tree.contentWidgets.map((widget) => widget.widgetType)));
}

function collectTreeLayoutTypes(trees: readonly PhiResolvedCmsRenderableTree[]) {
  return new Set(trees.flatMap((tree) => tree.layoutNodes.map((layout) => {
    const { pluginKey, typeKey } = splitPhiCmsLayoutNamespacedTypeKey(layout.widgetType);
    return `${pluginKey}/${typeKey}`;
  })));
}

function collectTreeWidgetImplementationModes({
  moduleSet,
  trees,
}: {
  moduleSet: PhiResolvedRuntimeModuleSet;
  trees: readonly PhiResolvedCmsRenderableTree[];
}) {
  const modesByType = new Map<string, Set<PhiRuntimeWidgetImplementationMode>>();
  for (const tree of trees) {
    for (const widget of tree.contentWidgets) {
      const entry = moduleSet.widgetDefinitionsByType.get(widget.widgetType);
      if (!entry) {
        continue;
      }
      const mode = resolvePhiRuntimeWidgetImplementationMode(
        entry.renderPolicies,
        readPhiRuntimeTreeRenderMode(widget.config),
      );
      if (!mode) {
        continue;
      }
      const modes = modesByType.get(widget.widgetType) ?? new Set();
      modes.add(mode);
      modesByType.set(widget.widgetType, modes);
    }
  }
  return modesByType;
}

function collectDataProviderKeysFromValue(
  value: unknown,
  knownProviderKeys: ReadonlySet<PhiRuntimeDataProviderKey>,
  collected: Set<PhiRuntimeDataProviderKey>,
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectDataProviderKeysFromValue(item, knownProviderKeys, collected);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (
      key === "providerKey" &&
      typeof entry === "string" &&
      knownProviderKeys.has(entry as PhiRuntimeDataProviderKey)
    ) {
      collected.add(entry as PhiRuntimeDataProviderKey);
    }
    collectDataProviderKeysFromValue(entry, knownProviderKeys, collected);
  }
}

export function collectPhiRuntimeDataProviderKeys({
  moduleSet,
  trees,
}: {
  moduleSet: PhiResolvedRuntimeModuleSet;
  trees: readonly PhiResolvedCmsRenderableTree[];
}) {
  const knownProviderKeys = new Set(moduleSet.dataProviderDescriptorsByKey.keys());
  const collected = new Set<PhiRuntimeDataProviderKey>();

  for (const tree of trees) {
    for (const widget of tree.contentWidgets) {
      const definition = moduleSet.widgetDefinitionsByType.get(widget.widgetType)?.definition;
      const widgetConfig = { ...(definition?.defaultConfig ?? {}), ...widget.config };
      collectDataProviderKeysFromValue(
        widgetConfig,
        knownProviderKeys,
        collected,
      );
      for (const providerKey of definition?.requiredDataProviders ?? []) {
        if (knownProviderKeys.has(providerKey)) {
          collected.add(providerKey);
        }
      }
      if (widget.widgetType === PhiCmsWidgetType.Form) {
        const formId = parsePhiFormWidgetConfig(widgetConfig).formId;
        const form = formId ? moduleSet.formDefinitionsById.get(formId) : null;
        if (form) {
          collectDataProviderKeysFromValue(
            form.descriptor,
            knownProviderKeys,
            collected,
          );
        }
      }
    }
    for (const layout of tree.layoutNodes) {
      const { pluginKey, typeKey } = splitPhiCmsLayoutNamespacedTypeKey(layout.widgetType);
      const definition = moduleSet.layoutDefinitionsByType.get(`${pluginKey}/${typeKey}`)?.definition;
      collectDataProviderKeysFromValue(
        { ...(definition?.defaultConfig ?? {}), ...layout.config },
        knownProviderKeys,
        collected,
      );
    }
  }

  // Provider descriptors may depend on other Providers for semantic metadata,
  // for example enum or binding-field Options Providers. Follow those declared
  // edges transitively after collecting the Providers demanded by the trees.
  const visitedProviderDescriptors = new Set<PhiRuntimeDataProviderKey>();
  const pendingProviderDescriptors = [...collected];
  while (pendingProviderDescriptors.length > 0) {
    const providerKey = pendingProviderDescriptors.shift();
    if (!providerKey || visitedProviderDescriptors.has(providerKey)) continue;
    visitedProviderDescriptors.add(providerKey);
    const descriptor = moduleSet.dataProviderDescriptorsByKey.get(providerKey);
    if (!descriptor) continue;
    const previousSize = collected.size;
    collectDataProviderKeysFromValue(descriptor, knownProviderKeys, collected);
    if (collected.size === previousSize) continue;
    for (const dependencyKey of collected) {
      if (!visitedProviderDescriptors.has(dependencyKey) && !pendingProviderDescriptors.includes(dependencyKey)) {
        pendingProviderDescriptors.push(dependencyKey);
      }
    }
  }

  return collected;
}

export function collectPhiRuntimeFormOwnerModuleIds({
  moduleSet,
  trees,
}: {
  moduleSet: PhiResolvedRuntimeModuleSet;
  trees: readonly PhiResolvedCmsRenderableTree[];
}) {
  const collected = new Set<PhiRuntimeModuleId>();

  for (const tree of trees) {
    for (const widget of tree.contentWidgets) {
      if (widget.widgetType !== PhiCmsWidgetType.Form) {
        continue;
      }
      const definition = moduleSet.widgetDefinitionsByType.get(widget.widgetType)?.definition;
      const config = parsePhiFormWidgetConfig({
        ...(definition?.defaultConfig ?? {}),
        ...widget.config,
      });
      if (!config.formId) {
        continue;
      }
      const form = moduleSet.formDefinitionsById.get(config.formId);
      if (form) {
        collected.add(form.ownerModuleId);
      }
    }
  }

  return collected;
}

function readRenderIssueDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function reportRenderIssue(issue: PhiCmsRenderIssue, error?: unknown) {
  console.warn("[phi-runtime-modules] CMS renderer unavailable.", {
    issue,
    error,
  });
  return issue;
}

export async function resolvePhiRuntimeRenderRegistry({
  catalog,
  moduleSet,
  trees,
  serverCapabilities,
}: {
  catalog: PhiRuntimeModuleCatalog;
  moduleSet: PhiResolvedRuntimeModuleSet;
  trees: readonly PhiResolvedCmsRenderableTree[];
  serverCapabilities: PhiCapabilitySnapshot | null;
}): Promise<PhiResolvedRuntimeRenderRegistry> {
  const widgetTypes = collectTreeWidgetTypes(trees);
  const widgetImplementationModes = collectTreeWidgetImplementationModes({ moduleSet, trees });
  const layoutTypes = collectTreeLayoutTypes(trees);
  const dataProviderKeys = collectPhiRuntimeDataProviderKeys({ moduleSet, trees });
  const formOwnerModuleIds = collectPhiRuntimeFormOwnerModuleIds({ moduleSet, trees });

  const renderIssuesByWidgetType = new Map<string, PhiCmsRenderIssue>();
  const runtimeWidgetRenderIssuesByType = new Map<string, PhiCmsRenderIssue>();
  const previewWidgetRenderIssuesByType = new Map<string, PhiCmsRenderIssue>();
  const renderIssuesByLayoutType = new Map<string, PhiCmsRenderIssue>();
  const widgetEntries = [...widgetTypes].flatMap((type) => {
    const entry = moduleSet.widgetDefinitionsByType.get(type);
    if (!entry) {
      const moduleId = moduleSet.installedOwnerModuleIdByWidgetType.get(type) ?? null;
      const bindingResolution = moduleId
        ? moduleSet.unavailableModuleBindings.get(moduleId)
        : null;
      renderIssuesByWidgetType.set(type, reportRenderIssue({
        code: "missing-module",
        kind: "widget",
        type,
        moduleId,
        detail: moduleId
          ? bindingResolution && !bindingResolution.available
            ? `Owner module "${moduleId}" requires unavailable server capabilities: ` +
              `${bindingResolution.missingCapabilities.join(", ") || bindingResolution.diagnosticCode}.`
            : `Installed owner module "${moduleId}" is not active.`
          : "No installed runtime module owns this widget type.",
      }));
      return [];
    }
    return [[type, entry] as const];
  });
  const layoutEntries = [...layoutTypes].flatMap((type) => {
    const entry = moduleSet.layoutDefinitionsByType.get(type);
    if (!entry) {
      const moduleId = moduleSet.installedOwnerModuleIdByLayoutType.get(type) ?? null;
      const bindingResolution = moduleId
        ? moduleSet.unavailableModuleBindings.get(moduleId)
        : null;
      renderIssuesByLayoutType.set(type, reportRenderIssue({
        code: "missing-module",
        kind: "layout",
        type,
        moduleId,
        detail: moduleId
          ? bindingResolution && !bindingResolution.available
            ? `Owner module "${moduleId}" requires unavailable server capabilities: ` +
              `${bindingResolution.missingCapabilities.join(", ") || bindingResolution.diagnosticCode}.`
            : `Installed owner module "${moduleId}" is not active.`
          : "No installed runtime module owns this layout type.",
      }));
      return [];
    }
    return [[type, entry] as const];
  });
  const usedModuleIds = new Set<PhiRuntimeModuleId>([
    ...widgetEntries.map(([, entry]) => entry.ownerModuleId),
    ...layoutEntries.map(([, entry]) => entry.ownerModuleId),
    ...formOwnerModuleIds,
  ]);
  const dataProviderDescriptorsByKey = new Map(
    [...dataProviderKeys].flatMap((providerKey) => {
      const descriptor = moduleSet.dataProviderDescriptorsByKey.get(providerKey);
      return descriptor ? [[providerKey, descriptor] as const] : [];
    }),
  );

  const runtimeWidgetEntries = widgetEntries.filter(([type]) =>
    widgetImplementationModes.get(type)?.has("runtime")
  );
  const previewWidgetEntries = widgetEntries.filter(([type]) =>
    widgetImplementationModes.get(type)?.has("preview")
  );

  const loadRuntimeWidgetEntries = async (
    entries: typeof widgetEntries,
    issues: Map<string, PhiCmsRenderIssue>,
  ) => Promise.all(entries.map(async ([type, entry]) => {
    try {
      const plugin = await loadRuntimeWidgetPlugin(entry);
      const loadedType = `${plugin.pluginKey}/${plugin.typeKey}`;
      if (loadedType !== type) {
        throw new Error(`Runtime Widget loader for "${type}" returned "${loadedType}".`);
      }
      return [type, plugin] as const;
    } catch (error) {
      issues.set(type, reportRenderIssue({
        code: "renderer-load-failed",
        kind: "widget",
        type,
        moduleId: entry.ownerModuleId,
        detail: readRenderIssueDetail(error),
      }, error));
      return null;
    }
  }));
  const loadPreviewWidgetEntries = async (
    entries: typeof widgetEntries,
    issues: Map<string, PhiCmsRenderIssue>,
  ) => Promise.all(entries.map(async ([type, entry]) => {
    try {
      const plugin = await loadPreviewWidgetPlugin(entry);
      const loadedType = `${plugin.pluginKey}/${plugin.typeKey}`;
      if (loadedType !== type) {
        throw new Error(`Preview Widget loader for "${type}" returned "${loadedType}".`);
      }
      return [type, plugin] as const;
    } catch (error) {
      issues.set(type, reportRenderIssue({
        code: "renderer-load-failed",
        kind: "widget",
        type,
        moduleId: entry.ownerModuleId,
        detail: readRenderIssueDetail(error),
      }, error));
      return null;
    }
  }));

  const [runtimeWidgetPluginResults, previewWidgetPluginResults, layoutPluginResults, uiProviderResults] = await Promise.all([
    loadRuntimeWidgetEntries(runtimeWidgetEntries, runtimeWidgetRenderIssuesByType),
    loadPreviewWidgetEntries(previewWidgetEntries, previewWidgetRenderIssuesByType),
    Promise.all(layoutEntries.map(async ([type, entry]) => {
      try {
        const plugin = await loadLayoutPlugin(entry);
        const loadedType = `${plugin.pluginKey}/${plugin.typeKey}`;
        if (loadedType !== type) {
          throw new Error(`Layout loader for "${type}" returned "${loadedType}".`);
        }
        return [type, plugin] as const;
      } catch (error) {
        renderIssuesByLayoutType.set(type, reportRenderIssue({
          code: "renderer-load-failed",
          kind: "layout",
          type,
          moduleId: entry.ownerModuleId,
          detail: readRenderIssueDetail(error),
        }, error));
        return null;
      }
    })),
    Promise.all([...usedModuleIds].flatMap((moduleId) => {
      const catalogEntry = catalog.get(moduleId);
      return catalogEntry?.loadUiProvider ? [[moduleId, catalogEntry] as const] : [];
    }).map(async ([moduleId, catalogEntry]) => {
      try {
        const provider = await loadUiProvider(catalogEntry);
        return { moduleId, provider, error: null };
      } catch (error) {
        return { moduleId, provider: null, error };
      }
    })),
  ]);

  const runtimeWidgetPluginsByType = new Map<string, PhiCmsRuntimeWidgetPlugin<unknown>>(
    runtimeWidgetPluginResults.filter((entry): entry is NonNullable<typeof entry> => entry != null),
  );
  const previewWidgetPluginsByType = new Map<string, PhiCmsPreviewWidgetPlugin<unknown>>(
    previewWidgetPluginResults.filter((entry): entry is NonNullable<typeof entry> => entry != null),
  );
  const layoutPluginsByType = new Map(
    layoutPluginResults.filter((entry): entry is NonNullable<typeof entry> => entry != null),
  );
  const uiProvidersByModuleId = new Map<PhiRuntimeModuleId, NonNullable<(typeof uiProviderResults)[number]["provider"]>>();

  for (const result of uiProviderResults) {
    if (result.error) {
      for (const [type, entry] of widgetEntries) {
        if (entry.ownerModuleId !== result.moduleId) {
          continue;
        }
        runtimeWidgetPluginsByType.delete(type);
        previewWidgetPluginsByType.delete(type);
        const issue = reportRenderIssue({
          code: "renderer-load-failed",
          kind: "widget",
          type,
          moduleId: result.moduleId,
          detail: `Module UI provider failed: ${readRenderIssueDetail(result.error)}`,
        }, result.error);
        runtimeWidgetRenderIssuesByType.set(type, issue);
        previewWidgetRenderIssuesByType.set(type, issue);
      }
      for (const [type, entry] of layoutEntries) {
        if (entry.ownerModuleId !== result.moduleId) {
          continue;
        }
        layoutPluginsByType.delete(type);
        renderIssuesByLayoutType.set(type, reportRenderIssue({
          code: "renderer-load-failed",
          kind: "layout",
          type,
          moduleId: result.moduleId,
          detail: `Module UI provider failed: ${readRenderIssueDetail(result.error)}`,
        }, result.error));
      }
      continue;
    }
    if (result.provider) {
      uiProvidersByModuleId.set(result.moduleId, result.provider);
    }
  }

  return {
    runtimeModuleCatalog: catalog,
    serverCapabilities,
    runtimeWidgetPluginsByType,
    previewWidgetPluginsByType,
    layoutPluginsByType,
    widgetRenderPoliciesByType: new Map(
      widgetEntries.map(([type, entry]) => [type, entry.renderPolicies]),
    ),
    layoutRenderPoliciesByType: new Map(
      layoutEntries.map(([type, entry]) => [type, entry.renderPolicies]),
    ),
    widgetAccessPoliciesByType: new Map(
      widgetEntries.map(([type, entry]) => [
        type,
        entry.accessPolicy ?? PHI_VIEWER_ACCESS_ANYONE,
      ]),
    ),
    layoutAccessPoliciesByType: new Map(
      layoutEntries.map(([type, entry]) => [
        type,
        entry.accessPolicy ?? PHI_VIEWER_ACCESS_ANYONE,
      ]),
    ),
    roleProviderIdByWidgetType: new Map(
      widgetEntries.map(([type, entry]) => [
        type,
        moduleSet.moduleDefinitionsById.get(entry.ownerModuleId)?.serverBinding.providerId as PhiRoleProviderId,
      ]),
    ),
    roleProviderIdByLayoutType: new Map(
      layoutEntries.map(([type, entry]) => [
        type,
        moduleSet.moduleDefinitionsById.get(entry.ownerModuleId)?.serverBinding.providerId as PhiRoleProviderId,
      ]),
    ),
    renderIssuesByWidgetType,
    runtimeWidgetRenderIssuesByType,
    previewWidgetRenderIssuesByType,
    renderIssuesByLayoutType,
    ownerModuleIdByWidgetType: new Map(widgetEntries.map(([type, entry]) => [type, entry.ownerModuleId])),
    widgetSlotSizePoliciesByType: new Map(
      widgetEntries.map(([type, entry]) => [type, entry.definition.slotSizePolicy]),
    ),
    ownerModuleIdByLayoutType: new Map(layoutEntries.map(([type, entry]) => [type, entry.ownerModuleId])),
    uiProvidersByModuleId,
    dataProviderDescriptorsByKey,
    formDefinitionsById: moduleSet.formDefinitionsById,
  };
}
