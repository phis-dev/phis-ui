import type {
  PhiRuntimeModule,
  PhiRuntimeModuleDefinition,
  PhiRuntimeModuleCatalog,
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleId,
  PhiRuntimeModuleLayoutDefinition,
  PhiRuntimeModuleWidgetDefinition,
  PhiRuntimeControllerDefinition,
  PhiRuntimeModuleControllerDescriptor,
  PhiRuntimeModuleDataProviderDescriptor,
} from "../../types/cms-plugins";
import type { PhiRuntimeDataProviderKey } from "../../types/runtime-data-provider";
import { isPhiCalendarAdapterKey, type PhiCalendarAdapterKey } from "../../types/calendar";
import type { PhiFormProviderKey } from "../../types/form-descriptor";
import { isPhiFormId, readPhiFormPackageName } from "../../types/form-id";
import type { PhiCmsAreaDefinition } from "../../types/cms-module-descriptors";
import { isPhiCmsAreaKey } from "../../constants/cms-areas";
import { PHI_MODULE_MARKER, isPhiRuntimeModuleId } from "../../constants/module-identity";
import { isPhiCmsPluginCategory } from "../../constants/cms-plugin-categories";
import {
  PHI_RUNTIME_MODULE_CATEGORIES,
  isPhiRuntimeModuleCategory,
} from "../../constants/runtime-module-categories";
import { assertPhiSignalPluginMetaContract } from "../../types/signals";
import {
  isPhiViewerAccessPolicyProviderOwned,
  type PhiRoleProviderId,
  type PhiViewerAccessPolicy,
} from "../../types/access";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "./auth/ids";
import {
  isPhiOwnedRuntimeModuleId,
  isPhiRuntimeModuleSourceLocale,
  resolvePhiRuntimeModuleSourceLocale,
} from "../../types/runtime-module-locale";

export type {
  PhiCmsPreviewWidgetPlugin,
  PhiCmsRuntimeWidgetPlugin,
  PhiAuthoringRenderPolicy,
  PhiPreviewRenderPolicy,
  PhiResolvedRuntimeModuleSet,
  PhiResolvedRuntimeRenderRegistry,
  PhiRuntimeModule,
  PhiRuntimeModuleCatalog,
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleControllerMountPolicy,
  PhiRuntimeModuleAuthoringClientProps,
  PhiRuntimeModuleControllerClientProps,
  PhiRuntimeModuleControllerDescriptor,
  PhiRuntimeModuleDefinition,
  PhiRuntimeModuleId,
  PhiRuntimeModuleLoader,
  PhiRuntimeModuleDataProviderClientDefinition,
  PhiRuntimeModuleDataProviderDescriptor,
  PhiRuntimeModuleDataProviderClientProps,
  PhiRuntimeModuleFormDefinition,
  PhiRuntimeModuleLayoutDefinition,
  PhiRuntimeModuleRenderPolicies,
  PhiRuntimeModuleWidgetDefinition,
  PhiRuntimeModuleUiProvider,
  PhiRuntimeRenderPolicy,
} from "../../types/cms-plugins";
export type {
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsRoutePresetDescriptor,
  PhiCmsThemePresetDescriptor,
} from "../../types/cms-module-descriptors";

export function buildPhiRuntimeModuleDataProviderDescriptor(
  definition: PhiRuntimeModuleDataProviderDescriptor,
) {
  return {
    key: definition.key,
    ownerModuleId: definition.ownerModuleId,
    kind: definition.kind,
    executionMode: definition.executionMode,
    authoringMode: definition.authoringMode,
    title: definition.title,
    description: definition.description,
    settingsFields: definition.settingsFields,
    resources: definition.resources,
  };
}

export function buildPhiRuntimeModuleWidgetType(
  entry: Pick<PhiRuntimeModuleWidgetDefinition, "definition">,
) {
  return `${entry.definition.pluginKey}/${entry.definition.typeKey}`;
}

export function buildPhiRuntimeModuleLayoutType(
  entry: Pick<PhiRuntimeModuleLayoutDefinition, "definition">,
) {
  return `${entry.definition.pluginKey}/${entry.definition.typeKey}`;
}

export function buildPhiRuntimeModuleControllerDescriptor(
  definition: PhiRuntimeControllerDefinition<unknown, unknown>,
): PhiRuntimeModuleControllerDescriptor {
  return {
    pluginKey: definition.pluginKey,
    key: definition.key,
    title: definition.title,
    description: definition.description,
    icon: definition.icon,
    iconFamily: definition.iconFamily,
    flags: definition.flags,
    allowedMountScopes: definition.allowedMountScopes,
    runtimeSignals: definition.runtimeSignals,
  };
}

function isNamespacedRuntimeKey(value: string) {
  const separatorIndex = value.lastIndexOf("/");
  return separatorIndex > 0 && separatorIndex < value.length - 1;
}

function assertPhiTableProviderResources(
  moduleId: PhiRuntimeModuleId,
  provider: PhiRuntimeModuleDataProviderDescriptor,
) {
  if (provider.kind !== "table") return;
  if (!provider.resources?.length) {
    throw new Error(`${moduleId}: Table provider "${provider.key}" must declare at least one resource.`);
  }
  const resourceKeys = new Set<string>();
  for (const resource of provider.resources) {
    if (!resource.resourceKey.trim() || resourceKeys.has(resource.resourceKey)) {
      throw new Error(`${moduleId}: Table provider "${provider.key}" has an empty or duplicate resource key.`);
    }
    resourceKeys.add(resource.resourceKey);
    if (!resource.title.trim() || !resource.rowIdentityPath.trim()) {
      throw new Error(`${moduleId}: Table resource "${resource.resourceKey}" needs title and row identity path.`);
    }
    const fieldKeys = new Set<string>();
    if (resource.fields.length === 0) {
      throw new Error(`${moduleId}: Table resource "${resource.resourceKey}" needs a field schema.`);
    }
    for (const field of resource.fields) {
      if (!field.key.trim() || !field.title.trim() || fieldKeys.has(field.key)) {
        throw new Error(`${moduleId}: Table resource "${resource.resourceKey}" has an invalid field schema.`);
      }
      fieldKeys.add(field.key);
      if ((field.type === "enum" || field.type === "enum[]") &&
        ((field.options?.length ?? 0) === 0) === !field.optionsProvider) {
        throw new Error(
          `${moduleId}: Table field "${resource.resourceKey}/${field.key}" must declare exactly one option source.`,
        );
      }
      if (field.type !== "enum" && field.type !== "enum[]" && (field.options || field.optionsProvider)) {
        throw new Error(`${moduleId}: non-enum Table field "${resource.resourceKey}/${field.key}" must not declare options.`);
      }
      if (field.constraints) {
        const expectsNumericBounds = field.type === "number";
        if ((field.type !== "number" && field.type !== "date" && field.type !== "datetime") ||
          (field.constraints.min !== undefined && typeof field.constraints.min !== (expectsNumericBounds ? "number" : "string")) ||
          (field.constraints.max !== undefined && typeof field.constraints.max !== (expectsNumericBounds ? "number" : "string")) ||
          ((field.constraints.step !== undefined || field.constraints.precision !== undefined) && field.type !== "number") ||
          (field.constraints.step !== undefined && (!Number.isFinite(field.constraints.step) || field.constraints.step <= 0)) ||
          (field.constraints.precision !== undefined &&
            (!Number.isInteger(field.constraints.precision) || field.constraints.precision < 0))) {
          throw new Error(`${moduleId}: Table field "${resource.resourceKey}/${field.key}" has invalid constraints.`);
        }
      }
      if (field.options?.length) {
        const optionIdentities = new Set(field.options.map((option) => `${typeof option.value}:${String(option.value)}`));
        const optionTypes = new Set(field.options.map((option) => typeof option.value));
        if (optionIdentities.size !== field.options.length || optionTypes.size !== 1 ||
          [...optionTypes].some((type) => type !== "string" && type !== "number")) {
          throw new Error(`${moduleId}: Table field "${resource.resourceKey}/${field.key}" has invalid options.`);
        }
      }
      if (field.editor?.fieldProviderKey && !isNamespacedRuntimeKey(field.editor.fieldProviderKey)) {
        throw new Error(`${moduleId}: Table field "${resource.resourceKey}/${field.key}" has an invalid editor key.`);
      }
    }
    if (!fieldKeys.has(resource.rowIdentityPath)) {
      throw new Error(
        `${moduleId}: Table resource "${resource.resourceKey}" row identity is missing from its field schema.`,
      );
    }
    const summaryFieldKeys = new Set<string>();
    for (const field of resource.summaryFields ?? []) {
      if (!field.key.trim() || !field.title.trim() || summaryFieldKeys.has(field.key)) {
        throw new Error(`${moduleId}: Table resource "${resource.resourceKey}" has an invalid summary field schema.`);
      }
      summaryFieldKeys.add(field.key);
    }
    if (resource.hierarchy && !fieldKeys.has(resource.hierarchy.parentRowIdentityPath)) {
      throw new Error(
        `${moduleId}: Table resource "${resource.resourceKey}" parent identity is missing from its field schema.`,
      );
    }
    if (resource.rowOrdering === "tree" && !resource.hierarchy) {
      throw new Error(`${moduleId}: tree row ordering requires a declared hierarchy.`);
    }
    for (const capability of [...(resource.dragSources ?? []), ...(resource.dropTargets ?? [])]) {
      if (!isNamespacedRuntimeKey(capability.payloadType) ||
        capability.modes?.some((mode) => !["before", "after", "child", "replace", "append"].includes(mode))) {
        throw new Error(`${moduleId}: Table resource "${resource.resourceKey}" has an invalid DnD capability.`);
      }
    }
    const filterFields = resource.query.filterFields ?? [];
    if (new Set(filterFields).size !== filterFields.length || filterFields.some((key) => !key.trim())) {
      throw new Error(
        `${moduleId}: Table resource "${resource.resourceKey}" has invalid or duplicate filter fields.`,
      );
    }
    const facets = resource.query.facets ?? [];
    if (new Set(facets).size !== facets.length || facets.some((key) => !key.trim())) {
      throw new Error(`${moduleId}: Table resource "${resource.resourceKey}" has invalid or duplicate facets.`);
    }
    const actionKeys = new Set<string>();
    for (const action of resource.actions ?? []) {
      if (!action.key.trim() || !action.title.trim() || actionKeys.has(action.key)) {
        throw new Error(`${moduleId}: Table resource "${resource.resourceKey}" has an invalid action schema.`);
      }
      actionKeys.add(action.key);
      if (action.intent === "destructive" && action.confirmation !== "required") {
        throw new Error(`${moduleId}: destructive Table action "${resource.resourceKey}/${action.key}" must require confirmation.`);
      }
    }
    const bindingFieldKeys = new Set<string>();
    for (const bindingField of resource.bindingFields ?? []) {
      if (!bindingField.key.trim() || !bindingField.title.trim() || bindingFieldKeys.has(bindingField.key)) {
        throw new Error(`${moduleId}: Table resource "${resource.resourceKey}" has an invalid binding field schema.`);
      }
      bindingFieldKeys.add(bindingField.key);
      if (bindingField.type === "enum" &&
        ((bindingField.options?.length ?? 0) === 0) === !bindingField.optionsProvider) {
        throw new Error(`${moduleId}: Table binding field "${resource.resourceKey}/${bindingField.key}" must declare exactly one option source.`);
      }
      if (bindingField.type === "string" && (bindingField.options || bindingField.optionsProvider)) {
        throw new Error(`${moduleId}: string Table binding field "${resource.resourceKey}/${bindingField.key}" must not declare options.`);
      }
      if (bindingField.defaultValue !== undefined &&
        typeof bindingField.defaultValue !== "string" && typeof bindingField.defaultValue !== "number") {
        throw new Error(`${moduleId}: Table binding field "${resource.resourceKey}/${bindingField.key}" has an invalid default value.`);
      }
      if (bindingField.create) {
        const createAction = resource.actions?.find((action) => action.key === bindingField.create?.actionKey);
        if (!createAction || createAction.scope !== "resource" || createAction.valueType !== "string") {
          throw new Error(`${moduleId}: Table binding field "${resource.resourceKey}/${bindingField.key}" has an invalid create action.`);
        }
      }
    }
  }
}

function assertPhiTreeProviderResources(
  moduleId: PhiRuntimeModuleId,
  provider: PhiRuntimeModuleDataProviderDescriptor,
) {
  if (provider.kind !== "tree") return;
  if (!provider.resources.length) {
    throw new Error(`${moduleId}: Tree provider "${provider.key}" must declare at least one resource.`);
  }
  const resourceKeys = new Set<string>();
  for (const resource of provider.resources) {
    if (!resource.resourceKey.trim() || resourceKeys.has(resource.resourceKey)) {
      throw new Error(`${moduleId}: Tree provider "${provider.key}" has an empty or duplicate resource key.`);
    }
    resourceKeys.add(resource.resourceKey);
    if (!resource.title.trim() || !resource.nodeIdentityPath.trim() ||
      !resource.parentNodeIdentityPath.trim() || !resource.titleFieldKey.trim()) {
      throw new Error(`${moduleId}: Tree resource "${resource.resourceKey}" has incomplete identity or title paths.`);
    }
    if (!resource.fields.length) {
      throw new Error(`${moduleId}: Tree resource "${resource.resourceKey}" needs a field schema.`);
    }
    const fieldKeys = new Set<string>();
    for (const field of resource.fields) {
      if (!field.key.trim() || !field.title.trim() || fieldKeys.has(field.key)) {
        throw new Error(`${moduleId}: Tree resource "${resource.resourceKey}" has an invalid field schema.`);
      }
      fieldKeys.add(field.key);
      if ((field.type === "enum" || field.type === "enum[]") &&
        ((field.options?.length ?? 0) === 0) === !field.optionsProvider) {
        throw new Error(`${moduleId}: Tree field "${resource.resourceKey}/${field.key}" must declare exactly one option source.`);
      }
      if (field.type !== "enum" && field.type !== "enum[]" && (field.options || field.optionsProvider)) {
        throw new Error(`${moduleId}: non-enum Tree field "${resource.resourceKey}/${field.key}" must not declare options.`);
      }
    }
    for (const path of [
      resource.nodeIdentityPath,
      resource.parentNodeIdentityPath,
      resource.titleFieldKey,
      resource.descriptionFieldKey,
      resource.iconFieldKey,
    ].filter((value): value is string => Boolean(value))) {
      if (!fieldKeys.has(path)) {
        throw new Error(`${moduleId}: Tree resource "${resource.resourceKey}" references undeclared field "${path}".`);
      }
    }
    for (const capability of resource.dragSources ?? []) {
      if (!isNamespacedRuntimeKey(capability.payloadType) || !fieldKeys.has(capability.sourceObjectIdentityPath)) {
        throw new Error(`${moduleId}: Tree resource "${resource.resourceKey}" has an invalid drag source.`);
      }
    }
    for (const capability of resource.dropTargets ?? []) {
      if (!isNamespacedRuntimeKey(capability.payloadType) ||
        capability.modes?.some((mode) => !["before", "after", "child", "replace", "append"].includes(mode))) {
        throw new Error(`${moduleId}: Tree resource "${resource.resourceKey}" has an invalid drop target.`);
      }
    }
    const bindingFieldKeys = new Set<string>();
    for (const bindingField of resource.bindingFields ?? []) {
      if (!bindingField.key.trim() || !bindingField.title.trim() || bindingFieldKeys.has(bindingField.key)) {
        throw new Error(`${moduleId}: Tree resource "${resource.resourceKey}" has an invalid binding field schema.`);
      }
      bindingFieldKeys.add(bindingField.key);
      if (bindingField.type === "enum" &&
        ((bindingField.options?.length ?? 0) === 0) === !bindingField.optionsProvider) {
        throw new Error(`${moduleId}: Tree binding field "${resource.resourceKey}/${bindingField.key}" must declare exactly one option source.`);
      }
    }
    const actionKeys = new Set<string>();
    for (const action of resource.actions ?? []) {
      if (!action.key.trim() || !action.title.trim() || actionKeys.has(action.key)) {
        throw new Error(`${moduleId}: Tree resource "${resource.resourceKey}" has an invalid action schema.`);
      }
      actionKeys.add(action.key);
      if (action.intent === "destructive" && action.confirmation !== "required") {
        throw new Error(`${moduleId}: destructive Tree action "${resource.resourceKey}/${action.key}" must require confirmation.`);
      }
    }
  }
}

function assertPhiCollectionProviderResources(
  moduleId: PhiRuntimeModuleId,
  provider: PhiRuntimeModuleDataProviderDescriptor,
) {
  if (provider.kind !== "collection") return;
  if (!provider.resources.length) {
    throw new Error(`${moduleId}: Collection provider "${provider.key}" must declare at least one resource.`);
  }
  const resourceKeys = new Set<string>();
  let defaultCount = 0;
  for (const resource of provider.resources) {
    if (!resource.resourceKey.trim() || resourceKeys.has(resource.resourceKey)) {
      throw new Error(`${moduleId}: Collection provider "${provider.key}" has an invalid resource key.`);
    }
    resourceKeys.add(resource.resourceKey);
    if (!resource.title.trim() || !resource.itemIdentityPath.trim() || !isNamespacedRuntimeKey(resource.itemRendererKey)) {
      throw new Error(`${moduleId}: Collection resource "${resource.resourceKey}" has invalid identity or renderer metadata.`);
    }
    if (resource.defaultForWidget) defaultCount += 1;
    const filterKeys = (resource.query.filterFields ?? []).map((field) => field.key);
    if (new Set(filterKeys).size !== filterKeys.length || resource.query.filterFields?.some((field) =>
      !field.key.trim() || !field.title.trim())) {
      throw new Error(`${moduleId}: Collection resource "${resource.resourceKey}" has invalid filters.`);
    }
    const panelKeys = new Set((resource.panels ?? []).map((panel) => panel.key));
    if (panelKeys.size !== (resource.panels?.length ?? 0) || resource.panels?.some((panel) =>
      !panel.key.trim() || !panel.title.trim())) {
      throw new Error(`${moduleId}: Collection resource "${resource.resourceKey}" has invalid panels.`);
    }
    const actionKeys = new Set<string>();
    for (const action of resource.actions ?? []) {
      if (!action.key.trim() || !action.title.trim() || actionKeys.has(action.key) ||
        (action.panelKey && !panelKeys.has(action.panelKey))) {
        throw new Error(`${moduleId}: Collection resource "${resource.resourceKey}" has an invalid action.`);
      }
      actionKeys.add(action.key);
    }
  }
  if (defaultCount > 1) {
    throw new Error(`${moduleId}: Collection provider "${provider.key}" declares several default resources.`);
  }
}

function assertPhiDataProviderResources(
  moduleId: PhiRuntimeModuleId,
  provider: PhiRuntimeModuleDataProviderDescriptor,
) {
  if (provider.kind !== "table" && provider.kind !== "tree" && provider.kind !== "collection" &&
    (provider as unknown as Record<string, unknown>).resources !== undefined) {
    throw new Error(`${moduleId}: provider "${provider.key}" of kind "${provider.kind}" must not declare resources.`);
  }
  assertPhiTableProviderResources(moduleId, provider);
  assertPhiTreeProviderResources(moduleId, provider);
  assertPhiCollectionProviderResources(moduleId, provider);
}

function assertPhiRuntimeModuleMetadata(definition: PhiRuntimeModuleDefinition) {
  for (const [key, value] of [
    ["title", definition.title],
    ["description", definition.description],
  ] as const) {
    if (!value.trim()) {
      throw new Error(`${definition.moduleId}: ${key} must be a non-empty string.`);
    }
  }
  if (!isPhiRuntimeModuleCategory(definition.category)) {
    throw new Error(
      `${definition.moduleId}: category must be one of ${PHI_RUNTIME_MODULE_CATEGORIES.join(", ")}.`,
    );
  }
  if (!definition.icon?.trim() && !definition.iconFamily?.trim()) {
    throw new Error(`${definition.moduleId}: icon or iconFamily must be a non-empty string.`);
  }
  if (definition.sourceLocale != null && !isPhiRuntimeModuleSourceLocale(definition.sourceLocale)) {
    throw new Error(`${definition.moduleId}: sourceLocale must be a valid canonical locale.`);
  }
  const sourceLocale = resolvePhiRuntimeModuleSourceLocale(definition);
  if (isPhiOwnedRuntimeModuleId(definition.moduleId) && sourceLocale !== "en") {
    throw new Error(`${definition.moduleId}: Phi-owned Modules must use English canonical copy.`);
  }
  if (definition.authUiProvider) {
    if (!isNamespacedRuntimeKey(definition.authUiProvider.providerKey)) {
      throw new Error(`${definition.moduleId}: Auth UI provider key must be namespaced.`);
    }
    if (
      !hasPhiRuntimeModuleController(definition) ||
      definition.controllerMountPolicy !== "area" ||
      definition.authUiProvider.controllerType !== definition.controllerType
    ) {
      throw new Error(
        `${definition.moduleId}: Auth UI provider must reference its Area-mounted module controller.`,
      );
    }
    const capabilityEntries = Object.entries(definition.authUiProvider.capabilitiesByArea);
    if (capabilityEntries.length === 0) {
      throw new Error(`${definition.moduleId}: Auth UI provider requires an Area capability projection.`);
    }
    for (const [area, capabilities] of capabilityEntries) {
      if (
        !isPhiCmsAreaKey(area) ||
        !definition.eligibleAreas.includes(area) ||
        !capabilities ||
        capabilities.length === 0 ||
        new Set(capabilities).size !== capabilities.length
      ) {
        throw new Error(
          `${definition.moduleId}: Auth UI provider capabilities must be non-empty, unique, and eligible per Area.`,
        );
      }
    }
    if (
      definition.authUiProvider.accountSecurityPath &&
      (
        !definition.authUiProvider.accountSecurityPath.startsWith("/") ||
        definition.authUiProvider.accountSecurityPath.startsWith("//")
      )
    ) {
      throw new Error(`${definition.moduleId}: Auth account security path must be Site-relative.`);
    }
  }
}

type PhiRuntimeModuleDefinitionWithController = PhiRuntimeModuleDefinition & Required<Pick<
  PhiRuntimeModuleDefinition,
  "controllerType" | "controller" | "controllerMountPolicy"
>>;

export function hasPhiRuntimeModuleController<TDefinition extends PhiRuntimeModuleDefinition>(
  definition: TDefinition,
): definition is TDefinition & PhiRuntimeModuleDefinitionWithController {
  const fields = [
    definition.controllerType,
    definition.controller,
    definition.controllerMountPolicy,
  ];
  const presentCount = fields.filter((field) => field != null).length;
  if (presentCount !== 0 && presentCount !== fields.length) {
    throw new Error(
      `${definition.moduleId}: controllerType, controller, and controllerMountPolicy must be declared together.`,
    );
  }
  return presentCount === fields.length;
}

function assertPhiRuntimeModuleServerBinding(
  definition: PhiRuntimeModuleDefinition,
) {
  const { providerId, requiredCapabilities } = definition.serverBinding;
  if (!/^@[^/]+\/[^/]+(?:\/[^/]+)*$/.test(providerId)) {
    throw new Error(`${definition.moduleId}: invalid server provider id "${providerId}".`);
  }
  if (
    new Set(requiredCapabilities).size !== requiredCapabilities.length ||
    requiredCapabilities.some((capability) => !/^@[^/]+\/[^:]+:v[1-9]\d*$/.test(capability))
  ) {
    throw new Error(
      `${definition.moduleId}: required server capabilities must be unique versioned namespaced ids.`,
    );
  }
}

function assertPhiRuntimeModuleRenderPolicies(
  moduleId: PhiRuntimeModuleId,
  type: string,
  policies: PhiRuntimeModuleWidgetDefinition["renderPolicies"],
) {
  if (!policies || typeof policies !== "object") {
    throw new Error(`${moduleId}: artifact "${type}" has no render policies.`);
  }
  if (policies.runtime !== "custom") {
    throw new Error(`${moduleId}: artifact "${type}" declares an invalid Runtime render policy.`);
  }
  if (!["custom", "runtimeReadOnly", "visualSkeleton", "visualPlaceholder"].includes(policies.preview)) {
    throw new Error(`${moduleId}: artifact "${type}" declares an invalid Preview render policy.`);
  }
  if (!["custom", "usePreview"].includes(policies.authoring)) {
    throw new Error(`${moduleId}: artifact "${type}" declares an invalid Authoring render policy.`);
  }
}

function assertOwnedAccessPolicy(
  moduleId: PhiRuntimeModuleId,
  ownerProviderId: PhiRoleProviderId,
  policy: PhiViewerAccessPolicy | null | undefined,
  subject: string,
) {
  if (policy && !isPhiViewerAccessPolicyProviderOwned(policy, ownerProviderId)) {
    throw new Error(
      `${moduleId}: ${subject} references role provider "${policy.access === "roles" ? policy.providerId : ""}" ` +
      `instead of Core or its bound provider "${ownerProviderId}".`,
    );
  }
}

function assertNavigationItemAccessPolicies(
  moduleId: PhiRuntimeModuleId,
  ownerProviderId: PhiRoleProviderId,
  items: readonly {
    itemKey: string;
    accessPolicy?: PhiViewerAccessPolicy;
    children?: readonly {
      itemKey: string;
      accessPolicy?: PhiViewerAccessPolicy;
      children?: readonly unknown[];
    }[];
  }[],
) {
  for (const item of items) {
    assertOwnedAccessPolicy(
      moduleId,
      ownerProviderId,
      item.accessPolicy,
      `navigation item "${item.itemKey}"`,
    );
    if (item.children?.length) {
      assertNavigationItemAccessPolicies(
        moduleId,
        ownerProviderId,
        item.children as Parameters<typeof assertNavigationItemAccessPolicies>[2],
      );
    }
  }
}

export function createPhiRuntimeModuleCatalog(
  entries: readonly PhiRuntimeModuleCatalogEntry[],
  areaDefinitions: readonly PhiCmsAreaDefinition[],
): PhiRuntimeModuleCatalog {
  const catalog = new Map<PhiRuntimeModuleId, PhiRuntimeModuleCatalogEntry>();
  const ownerModuleIdByControllerType = new Map<string, PhiRuntimeModuleId>();
  const ownerModuleIdByWidgetType = new Map<string, PhiRuntimeModuleId>();
  const ownerModuleIdByLayoutType = new Map<string, PhiRuntimeModuleId>();
  const ownerModuleIdByDataProviderKey = new Map<PhiRuntimeDataProviderKey, PhiRuntimeModuleId>();
  const ownerModuleIdByCalendarAdapterKey = new Map<PhiCalendarAdapterKey, PhiRuntimeModuleId>();
  const ownerModuleIdByFormFieldTypeKey = new Map<PhiFormProviderKey, PhiRuntimeModuleId>();
  const ownerModuleIdByFormValidationKey = new Map<PhiFormProviderKey, PhiRuntimeModuleId>();
  const ownerModuleIdByFormHandlerKey = new Map<PhiFormProviderKey, PhiRuntimeModuleId>();
  const ownerModuleIdByFormId = new Map<string, PhiRuntimeModuleId>();
  let platformModuleId: PhiRuntimeModuleId | null = null;

  for (const entry of entries) {
    const { definition } = entry;
    // The module id is the one identifier the whole grammar hangs off: every key a module owns is
    // built from it, and a route segment is derived from it. A bare `<package>/<key>` used to pass
    // here and only failed later, in whichever consumer happened to parse it first.
    if (!isPhiRuntimeModuleId(definition.moduleId)) {
      throw new Error(
        `Invalid runtime module id "${definition.moduleId}": expected <npm-package>/${PHI_MODULE_MARKER}/<module-key>.`,
      );
    }
    assertPhiRuntimeModuleMetadata(definition);
    assertPhiRuntimeModuleServerBinding(definition);
    const ownerProviderId = definition.serverBinding.providerId as PhiRoleProviderId;
    assertOwnedAccessPolicy(
      definition.moduleId,
      ownerProviderId,
      definition.accessPolicy,
      "module access policy",
    );
    const hasController = hasPhiRuntimeModuleController(definition);
    if (hasController) {
      if (!isNamespacedRuntimeKey(definition.controllerType)) {
        throw new Error(`Invalid runtime module controller type "${definition.controllerType}".`);
      }
      const descriptorControllerType = `${definition.controller.pluginKey}/${definition.controller.key}`;
      if (descriptorControllerType !== definition.controllerType) {
        throw new Error(
          `Runtime module "${definition.moduleId}" controller descriptor "${descriptorControllerType}" ` +
          `does not match "${definition.controllerType}".`,
        );
      }
    } else if (definition.kind === "platform") {
      throw new Error(`Platform runtime module "${definition.moduleId}" must declare a Controller.`);
    }
    if (catalog.has(definition.moduleId)) {
      throw new Error(`Duplicate runtime module id "${definition.moduleId}".`);
    }
    if (definition.kind === "platform") {
      if (platformModuleId) {
        throw new Error(
          `Runtime catalog contains more than one Platform contribution: ` +
          `"${platformModuleId}" and "${definition.moduleId}".`,
        );
      }
      platformModuleId = definition.moduleId;
    }
    const eligibleAreas = new Set(definition.eligibleAreas);
    if (
      eligibleAreas.size !== definition.eligibleAreas.length ||
      definition.eligibleAreas.some((area) => !isPhiCmsAreaKey(area))
    ) {
      throw new Error(`${definition.moduleId}: eligibleAreas must contain unique canonical Area keys.`);
    }
    assertPhiRuntimeModuleArtifacts(
      entry.widgets,
      entry.layouts,
      definition.moduleId,
      ownerProviderId,
    );
    for (const preset of [
      ...(entry.areaShells ?? []),
      ...(entry.areaOverlays ?? []),
      ...(entry.routes ?? []),
      ...(entry.themes ?? []),
    ]) {
      if (preset.ownerModuleId !== definition.moduleId) {
        throw new Error(`${definition.moduleId}: preset "${preset.presetKey}" has a different owner module.`);
      }
    }
    for (const route of entry.routes ?? []) {
      assertOwnedAccessPolicy(
        definition.moduleId,
        ownerProviderId,
        route.accessPolicy,
        `route preset "${route.presetKey}"`,
      );
      for (const injection of route.navigation ?? []) {
        assertNavigationItemAccessPolicies(
          definition.moduleId,
          ownerProviderId,
          [injection.item],
        );
      }
    }
    for (const provider of definition.dataProviders ?? []) {
      if (!isNamespacedRuntimeKey(provider.key)) {
        throw new Error(`${definition.moduleId}: invalid data provider key "${provider.key}".`);
      }
      if (provider.ownerModuleId !== definition.moduleId) {
        throw new Error(`${definition.moduleId}: data provider "${provider.key}" has a different owner module id.`);
      }
      if (provider.executionMode !== "static" && provider.executionMode !== "live") {
        throw new Error(`${definition.moduleId}: data provider "${provider.key}" has an invalid execution mode.`);
      }
      if (provider.authoringMode !== "none" && provider.authoringMode !== "read" && provider.authoringMode !== "edit") {
        throw new Error(`${definition.moduleId}: data provider "${provider.key}" has an invalid Authoring mode.`);
      }
      if ("authoringPolicy" in provider) {
        throw new Error(`${definition.moduleId}: data provider "${provider.key}" uses forbidden authoringPolicy.`);
      }
      assertPhiDataProviderResources(definition.moduleId, provider);
      const currentProviderOwner = ownerModuleIdByDataProviderKey.get(provider.key);
      if (currentProviderOwner) {
        throw new Error(
          `Data provider "${provider.key}" is owned by both "${currentProviderOwner}" and "${definition.moduleId}".`,
        );
      }
      ownerModuleIdByDataProviderKey.set(provider.key, definition.moduleId);
    }
    for (const adapter of definition.calendarAdapters ?? []) {
      if (!isPhiCalendarAdapterKey(adapter.key)) {
        throw new Error(`${definition.moduleId}: invalid Calendar adapter key "${adapter.key}".`);
      }
      if (adapter.ownerModuleId !== definition.moduleId) {
        throw new Error(`${definition.moduleId}: Calendar adapter "${adapter.key}" has a different owner module id.`);
      }
      const currentAdapterOwner = ownerModuleIdByCalendarAdapterKey.get(adapter.key);
      if (currentAdapterOwner) {
        throw new Error(
          `Calendar adapter "${adapter.key}" is owned by both "${currentAdapterOwner}" and "${definition.moduleId}".`,
        );
      }
      ownerModuleIdByCalendarAdapterKey.set(adapter.key, definition.moduleId);
    }
    const formProviderFamilies = [
      ["field type", definition.formProviders?.fieldTypes ?? [], ownerModuleIdByFormFieldTypeKey],
      ["validation", definition.formProviders?.validationRules ?? [], ownerModuleIdByFormValidationKey],
      ["handler", definition.formProviders?.handlers ?? [], ownerModuleIdByFormHandlerKey],
    ] as const;
    for (const [kind, providers, owners] of formProviderFamilies) {
      for (const provider of providers) {
        if (!isNamespacedRuntimeKey(provider.key)) {
          throw new Error(`${definition.moduleId}: invalid form ${kind} provider key "${provider.key}".`);
        }
        if (provider.ownerModuleId !== definition.moduleId) {
          throw new Error(
            `${definition.moduleId}: form ${kind} provider "${provider.key}" has a different owner module id.`,
          );
        }
        const currentProviderOwner = owners.get(provider.key);
        if (currentProviderOwner) {
          throw new Error(
            `Form ${kind} provider "${provider.key}" is owned by both ` +
            `"${currentProviderOwner}" and "${definition.moduleId}".`,
          );
        }
        owners.set(provider.key, definition.moduleId);
      }
    }
    for (const provider of definition.formProviders?.handlers ?? []) {
      if (
        !provider.handlerKey.trim() ||
        (provider.endpointKey == null && provider.upstreamPath == null) ||
        (provider.endpointKey != null && !provider.endpointKey.trim()) ||
        (provider.upstreamPath != null && !provider.upstreamPath.startsWith("/")) ||
        (provider.csrfPath != null && !provider.csrfPath.startsWith("/")) ||
        (provider.requiresCsrf && provider.csrfPath == null)
      ) {
        throw new Error(
          `${definition.moduleId}: form handler provider "${provider.key}" has invalid immutable execution metadata.`,
        );
      }
      if (provider.credentialPolicy === "auth-link" && definition.moduleId !== PHI_AUTH_RUNTIME_MODULE_ID) {
        throw new Error(
          `${definition.moduleId}: form handler provider "${provider.key}" cannot claim Core-only auth-link credentials.`,
        );
      }
    }
    for (const form of entry.forms ?? []) {
      if (!isPhiFormId(form.formId)) {
        throw new Error(`${definition.moduleId}: invalid namespaced Form id "${form.formId}".`);
      }
      if (form.ownerModuleId !== definition.moduleId) {
        throw new Error(
          `${definition.moduleId}: Form "${form.formId}" has a different owner module id.`,
        );
      }
      // A Form belongs to the module that owns it, not merely to the package that ships it.
      if (readPhiFormPackageName(form.formId) !== definition.moduleId) {
        throw new Error(
          `${definition.moduleId}: Form "${form.formId}" must use its owner module namespace ` +
          `"${definition.moduleId}/forms/*".`,
        );
      }
      if (form.descriptor.key !== form.formId) {
        throw new Error(
          `${definition.moduleId}: Form descriptor key "${form.descriptor.key}" does not match "${form.formId}".`,
        );
      }
      for (const [phase, handlerKey] of [
        ["submit", form.submitHandlerKey],
        ["confirm", form.confirmHandlerKey],
        ["preview", form.previewHandlerKey],
      ] as const) {
        if (
          handlerKey &&
          !(definition.formProviders?.handlers ?? []).some(
            (provider) => provider.phase === phase && provider.handlerKey === handlerKey,
          )
        ) {
          throw new Error(
            `${definition.moduleId}: Form "${form.formId}" requires missing owned ${phase} handler "${handlerKey}".`,
          );
        }
      }
      const currentFormOwner = ownerModuleIdByFormId.get(form.formId);
      if (currentFormOwner) {
        throw new Error(
          `Form "${form.formId}" is owned by both "${currentFormOwner}" and "${definition.moduleId}".`,
        );
      }
      ownerModuleIdByFormId.set(form.formId, definition.moduleId);
    }
    for (const widget of entry.widgets) {
      const type = buildPhiRuntimeModuleWidgetType(widget);
      const ownerModuleId = ownerModuleIdByWidgetType.get(type);
      if (ownerModuleId) {
        throw new Error(`Widget type "${type}" is owned by both "${ownerModuleId}" and "${definition.moduleId}".`);
      }
      ownerModuleIdByWidgetType.set(type, definition.moduleId);
    }
    for (const layout of entry.layouts) {
      const type = buildPhiRuntimeModuleLayoutType(layout);
      const ownerModuleId = ownerModuleIdByLayoutType.get(type);
      if (ownerModuleId) {
        throw new Error(`Layout type "${type}" is owned by both "${ownerModuleId}" and "${definition.moduleId}".`);
      }
      ownerModuleIdByLayoutType.set(type, definition.moduleId);
    }
    if (hasController) {
      const currentOwner = ownerModuleIdByControllerType.get(definition.controllerType);
      if (currentOwner) {
        throw new Error(
          `Runtime controller type "${definition.controllerType}" is owned by both ` +
          `"${currentOwner}" and "${definition.moduleId}".`,
        );
      }
      ownerModuleIdByControllerType.set(definition.controllerType, definition.moduleId);
    }
    catalog.set(definition.moduleId, entry);

    const contributionCount = entry.widgets.length + entry.layouts.length +
      (entry.forms?.length ?? 0) + (entry.areaShells?.length ?? 0) +
      (entry.areaOverlays?.length ?? 0) +
      (entry.routes?.length ?? 0) + (entry.themes?.length ?? 0) +
      (definition.dataProviders?.length ?? 0) + (definition.calendarAdapters?.length ?? 0) +
      Object.values(definition.formProviders ?? {}).reduce((count, providers) => count + (providers?.length ?? 0), 0);
    if (definition.kind === "module" && contributionCount === 0 && !hasController) {
      throw new Error(`Controllerless runtime module "${definition.moduleId}" must contribute at least one owned artifact.`);
    }
  }

  for (const entry of entries) {
    for (const widget of entry.widgets) {
      const type = buildPhiRuntimeModuleWidgetType(widget);
      const requiredProviderKeys = widget.definition.requiredDataProviders ?? [];
      if (new Set(requiredProviderKeys).size !== requiredProviderKeys.length) {
        throw new Error(`${entry.definition.moduleId}: widget "${type}" has duplicate required data providers.`);
      }
      for (const providerKey of requiredProviderKeys) {
        if (!isNamespacedRuntimeKey(providerKey)) {
          throw new Error(`${entry.definition.moduleId}: widget "${type}" has invalid data provider "${providerKey}".`);
        }
        if (!ownerModuleIdByDataProviderKey.has(providerKey)) {
          throw new Error(`${entry.definition.moduleId}: widget "${type}" requires unknown data provider "${providerKey}".`);
        }
      }
    }
  }

  for (const areaDefinition of areaDefinitions) {
    const baseModule = catalog.get(areaDefinition.baseModuleId)?.definition;
    if (!baseModule) {
      throw new Error(
        `Area "${areaDefinition.area}" references missing base module "${areaDefinition.baseModuleId}".`,
      );
    }
    const ownerProviderId = baseModule.serverBinding.providerId as PhiRoleProviderId;
    assertOwnedAccessPolicy(
      baseModule.moduleId,
      ownerProviderId,
      areaDefinition.accessPolicy,
      `Area "${areaDefinition.area}"`,
    );
    for (const surface of areaDefinition.navigationSurfaces ?? []) {
      assertNavigationItemAccessPolicies(
        baseModule.moduleId,
        ownerProviderId,
        surface.items,
      );
    }
  }

  return Object.assign(catalog, { areaDefinitions, platformModuleId });
}

export function assertPhiRuntimeModuleArtifacts(
  widgets: readonly PhiRuntimeModuleWidgetDefinition[],
  layouts: readonly PhiRuntimeModuleLayoutDefinition[],
  moduleId: PhiRuntimeModuleId,
  ownerProviderId: PhiRoleProviderId,
) {
  const widgetTypes = new Set<string>();
  for (const widget of widgets) {
    const type = buildPhiRuntimeModuleWidgetType(widget);
    if (widget.ownerModuleId !== moduleId) {
      throw new Error(`${moduleId}: widget "${type}" has a different owner module id.`);
    }
    if (!isNamespacedRuntimeKey(type)) {
      throw new Error(`${moduleId}: invalid owned widget type "${type}".`);
    }
    if (widgetTypes.has(type)) {
      throw new Error(`${moduleId}: duplicate owned widget type "${type}".`);
    }
    if (!isPhiCmsPluginCategory(widget.definition.category)) {
      throw new Error(
        `${moduleId}: widget "${type}" must declare a supported CMS plugin category.`,
      );
    }
    if (widget.definition.kind !== "widget") {
      throw new Error(`${moduleId}: owned widget "${type}" has an invalid artifact kind.`);
    }
    if (typeof widget.definition.parseConfig !== "function") {
      throw new Error(`${moduleId}: owned widget "${type}" has no config parser.`);
    }
    if (!Array.isArray(widget.definition.fields)) {
      throw new Error(`${moduleId}: owned widget "${type}" has no declarative field collection.`);
    }
    if (typeof widget.loadRuntime !== "function" || typeof widget.loadPreview !== "function") {
      throw new Error(`${moduleId}: owned widget "${type}" must declare Runtime and Preview loaders.`);
    }
    assertPhiRuntimeModuleRenderPolicies(moduleId, type, widget.renderPolicies);
    assertPhiSignalPluginMetaContract(widget.definition.runtimeSignals, `${type}.runtimeSignals`);
    assertOwnedAccessPolicy(
      moduleId,
      ownerProviderId,
      widget.accessPolicy,
      `widget "${type}"`,
    );
    widgetTypes.add(type);
  }

  const layoutTypes = new Set<string>();
  for (const layout of layouts) {
    const type = buildPhiRuntimeModuleLayoutType(layout);
    if (layout.ownerModuleId !== moduleId) {
      throw new Error(`${moduleId}: layout "${type}" has a different owner module id.`);
    }
    if (!isNamespacedRuntimeKey(type)) {
      throw new Error(`${moduleId}: invalid owned layout type "${type}".`);
    }
    if (layoutTypes.has(type)) {
      throw new Error(`${moduleId}: duplicate owned layout type "${type}".`);
    }
    if (!isPhiCmsPluginCategory(layout.definition.category)) {
      throw new Error(
        `${moduleId}: layout "${type}" must declare a supported CMS plugin category.`,
      );
    }
    if (layout.definition.kind !== "layout") {
      throw new Error(`${moduleId}: owned layout "${type}" has an invalid artifact kind.`);
    }
    if (typeof layout.loadRuntime !== "function") {
      throw new Error(`${moduleId}: owned layout "${type}" must declare a Runtime loader.`);
    }
    assertPhiRuntimeModuleRenderPolicies(moduleId, type, layout.renderPolicies);
    assertPhiSignalPluginMetaContract(layout.definition.runtimeSignals, `${type}.runtimeSignals`);
    assertOwnedAccessPolicy(
      moduleId,
      ownerProviderId,
      layout.accessPolicy,
      `layout "${type}"`,
    );
    layoutTypes.add(type);
  }
}

export function assertPhiRuntimeModuleCatalog(catalog: PhiRuntimeModuleCatalog): void {
  const rebuiltCatalog = createPhiRuntimeModuleCatalog(
    [...catalog.entries()].map(([moduleId, entry]) => {
      if (entry.definition.moduleId !== moduleId) {
        throw new Error(
          `Runtime module catalog key "${moduleId}" does not match entry "${entry.definition.moduleId}".`,
        );
      }
      if (typeof entry.load !== "function") {
        throw new Error(`Runtime module "${moduleId}" has no module loader.`);
      }
      if (hasPhiRuntimeModuleController(entry.definition)) {
        if (!entry.definition.controller.runtimeSignals) {
          throw new Error(`Runtime module "${moduleId}" controller has no signal metadata.`);
        }
        assertPhiSignalPluginMetaContract(
          entry.definition.controller.runtimeSignals,
          `${moduleId}.controller.runtimeSignals`,
        );
      }
      return entry;
    }),
    catalog.areaDefinitions,
  );

  if (rebuiltCatalog.platformModuleId !== catalog.platformModuleId) {
    throw new Error("Runtime module catalog declares an inconsistent Platform module id.");
  }
}

export function extendPhiRuntimeModuleCatalog(
  ...catalogs: readonly PhiRuntimeModuleCatalog[]
): PhiRuntimeModuleCatalog {
  const areaDefinitions = new Map(catalogs.flatMap((catalog) =>
    catalog.areaDefinitions.map((definition) => [definition.area, definition] as const),
  ));
  return createPhiRuntimeModuleCatalog(
    catalogs.flatMap((catalog) => [...catalog.values()]),
    [...areaDefinitions.values()],
  );
}

export function assertPhiRuntimeModule(module: PhiRuntimeModule) {
  assertPhiRuntimeModuleServerBinding(module);
  if (hasPhiRuntimeModuleController(module)) {
    if (!module.controllerDefinition) {
      throw new Error(`${module.moduleId}: Controller-bearing runtime module has no Controller definition.`);
    }
    const controllerType = `${module.controllerDefinition.pluginKey}/${module.controllerDefinition.key}`;
    if (controllerType !== module.controllerType) {
      throw new Error(
        `${module.moduleId}: controller type "${module.controllerType}" does not match ` +
        `controller definition "${controllerType}".`,
      );
    }
  } else if (module.controllerDefinition) {
    throw new Error(`${module.moduleId}: controllerless runtime module must not declare a Controller definition.`);
  }

  for (const descriptor of module.dataProviders ?? []) {
    if (descriptor.ownerModuleId !== module.moduleId) {
      throw new Error(
        `${module.moduleId}: data provider "${descriptor.key}" has a different owner module id.`,
      );
    }
  }
  for (const descriptor of module.calendarAdapters ?? []) {
    if (descriptor.ownerModuleId !== module.moduleId) {
      throw new Error(
        `${module.moduleId}: Calendar adapter "${descriptor.key}" has a different owner module id.`,
      );
    }
  }
}
