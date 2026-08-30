import {
  isPhiCmsAreaKey,
  resolvePhiCmsAreaMask,
  type PhiCmsAreaKey,
} from "../../constants/cms-areas";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../constants/phi-cms";
import { PhiCmsLayoutType } from "../../constants/cms-layout-types";
import {
  createPhiPresetCmsInstanceId,
  isPhiCmsInstanceId,
  readPhiCmsInstanceIdDescriptor,
} from "../../types/cms-instance-id";
import type {
  PhiCmsActiveRouteTable,
  PhiCmsAreaDefinition,
  PhiCmsAreaOverlayPresetDescriptor,
  PhiCmsAreaShellPresetBinding,
  PhiCmsAreaShellPresetDescriptor,
  PhiCmsCompiledDescriptorCatalog,
  PhiCmsCompiledRoutePattern,
  PhiCmsNavigationBaseItemDescriptor,
  PhiCmsNavigationInjectionItemDescriptor,
  PhiCmsNavigationInjectionDescriptor,
  PhiCmsNavigationItemPlacement,
  PhiCmsNavigationOverlay,
  PhiCmsNavigationOverlayDiagnostic,
  PhiCmsNavigationOverlayResolution,
  PhiCmsResolvedNavigationItem,
  PhiCmsResolvedNavigationSurface,
  PhiCmsRoutePresetBinding,
  PhiCmsRoutePresetDescriptor,
  PhiCmsThemePresetBinding,
  PhiRuntimeModuleId,
} from "../../types/cms-module-descriptors";
import type {
  PhiCmsPageNode,
  PhiResolvedCmsAreaPresetTree,
  PhiResolvedCmsPageTree,
} from "../../types/cms";
import type { PhiRuntimeModuleCatalog } from "../../types/cms-plugins";
import type { PhiBlockRuntime } from "../../types/widget-runtime";
import {
  canPhiViewerAccess,
  PHI_VIEWER_ACCESS_ANYONE,
  type PhiAccessViewer,
} from "../../types/access";
import {
  mergePhiCmsShellTrees,
  omitPhiCmsShellCompositionNodes,
} from "./shell-tree-composition";
import { buildPhiRuntimeModuleRouteSegment } from "../../helpers/runtime-module-route-path";
import { resolvePhiLayoutCreationPreset } from "../../helpers/cms-layout-defaults";

const PHI_CMS_REGION_TYPE_VALUES = new Set<number>(Object.values(PhiCmsRegionType));
const PHI_ROUTE_PARAMETER_PATTERN = /^:[A-Za-z][A-Za-z0-9_]*$/;
const PHI_ROUTE_MOUNT_KEY_PATTERN = /^[a-z][a-z0-9-]*$/;

function normalizeRequiredKey(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} must not be empty.`);
  }
  if (normalized !== value) {
    throw new Error(`${label} must be normalized.`);
  }
  return normalized;
}

function assertNamespacedKey(value: string, label: string) {
  const normalized = normalizeRequiredKey(value, label);
  const separatorIndex = normalized.lastIndexOf("/");
  if (separatorIndex <= 0 || separatorIndex === normalized.length - 1) {
    throw new Error(`${label} "${value}" must be namespaced.`);
  }
}

function assertPositiveVersion(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

export function buildPhiCmsPresetIdentityKey(
  ownerModuleId: PhiRuntimeModuleId,
  presetKey: string,
) {
  return `${ownerModuleId}\u001f${presetKey}`;
}

export function normalizePhiCmsRoutePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }
  const segments = trimmed.split("/").filter(Boolean);
  return `/${segments.join("/")}`;
}

function resolvePhiCmsMountedRouteDescriptor(
  descriptor: PhiCmsRoutePresetDescriptor,
  areaDefinition: PhiCmsAreaDefinition,
): PhiCmsRoutePresetDescriptor {
  if (!descriptor.mount) {
    return descriptor;
  }
  const mount = (areaDefinition.routeMounts ?? []).find(
    (candidate) => candidate.mountKey === descriptor.mount?.mountKey,
  );
  if (!mount) {
    throw new Error(
      `${descriptor.ownerModuleId}/${descriptor.presetKey}: Area "${descriptor.area}" ` +
      `does not declare route mount "${descriptor.mount.mountKey}".`,
    );
  }
  const relativePath = normalizePhiCmsRoutePath(descriptor.path);
  if (relativePath !== descriptor.path) {
    throw new Error(
      `${descriptor.ownerModuleId}/${descriptor.presetKey}: mounted route path ` +
      `"${descriptor.path}" must be normalized.`,
    );
  }
  const moduleSegment = buildPhiRuntimeModuleRouteSegment(descriptor.ownerModuleId);
  const basePath = mount.basePath === "/" ? "" : mount.basePath;
  const suffix = relativePath === "/" ? "" : relativePath;
  return {
    ...descriptor,
    path: `${basePath}/${moduleSegment}${suffix}`,
  };
}

export function compilePhiCmsRoutePattern(
  descriptor: PhiCmsRoutePresetDescriptor,
): PhiCmsCompiledRoutePattern {
  const path = normalizePhiCmsRoutePath(descriptor.path);
  if (path !== descriptor.path) {
    throw new Error(
      `${descriptor.ownerModuleId}/${descriptor.presetKey}: route path "${descriptor.path}" must be normalized.`,
    );
  }
  const segments = path.split("/").filter(Boolean);
  const dynamicSegments = segments.filter((segment) => segment.startsWith(":"));
  if (dynamicSegments.length > 1) {
    throw new Error(
      `${descriptor.ownerModuleId}/${descriptor.presetKey}: a route may contain at most one dynamic segment.`,
    );
  }
  for (const segment of segments) {
    if (
      segment.includes("*") ||
      segment.includes("?") ||
      segment.includes("(") ||
      segment.includes(")") ||
      segment === "." ||
      segment === ".." ||
      (segment.includes(":") && !PHI_ROUTE_PARAMETER_PATTERN.test(segment))
    ) {
      throw new Error(
        `${descriptor.ownerModuleId}/${descriptor.presetKey}: invalid route segment "${segment}".`,
      );
    }
  }
  return {
    descriptor,
    segments,
    parameterName: dynamicSegments[0]?.slice(1) ?? null,
  };
}

function routePatternsOverlap(
  left: PhiCmsCompiledRoutePattern,
  right: PhiCmsCompiledRoutePattern,
) {
  if (left.segments.length !== right.segments.length) {
    return false;
  }
  return left.segments.every((segment, index) => {
    const other = right.segments[index]!;
    return segment.startsWith(":") || other.startsWith(":") || segment === other;
  });
}

function collectNavigationItemKeys(
  items: readonly (PhiCmsNavigationBaseItemDescriptor | PhiCmsNavigationInjectionItemDescriptor)[],
  label: string,
) {
  const keys = new Set<string>();
  const visit = (
    entries: readonly (PhiCmsNavigationBaseItemDescriptor | PhiCmsNavigationInjectionItemDescriptor)[],
  ) => {
    for (const item of entries) {
      assertNamespacedKey(item.itemKey, `${label} item key`);
      if (keys.has(item.itemKey)) {
        throw new Error(`${label}: duplicate navigation item key "${item.itemKey}".`);
      }
      keys.add(item.itemKey);
      normalizeRequiredKey(item.label.defaultMessage, `${label}/${item.itemKey} default label`);
      visit(item.children ?? []);
    }
  };
  visit(items);
  return keys;
}

function findNavigationItemDescriptor(
  items: readonly (PhiCmsNavigationBaseItemDescriptor | PhiCmsNavigationInjectionItemDescriptor)[],
  itemKey: string,
): PhiCmsNavigationBaseItemDescriptor | PhiCmsNavigationInjectionItemDescriptor | null {
  for (const item of items) {
    if (item.itemKey === itemKey) {
      return item;
    }
    const child = findNavigationItemDescriptor(item.children ?? [], itemKey);
    if (child) {
      return child;
    }
  }
  return null;
}

function assertAreaDefinitions(
  areaDefinitions: readonly PhiCmsAreaDefinition[],
  catalog: PhiRuntimeModuleCatalog,
) {
  const definitionsByArea = new Map<PhiCmsAreaKey, PhiCmsAreaDefinition>();
  for (const definition of areaDefinitions) {
    if (!isPhiCmsAreaKey(definition.area)) {
      throw new Error(`Invalid Area definition "${String(definition.area)}".`);
    }
    if (definitionsByArea.has(definition.area)) {
      throw new Error(`Duplicate Area definition for "${definition.area}".`);
    }
    const baseModule = catalog.get(definition.baseModuleId);
    if (!baseModule) {
      throw new Error(
        `Area "${definition.area}" base module "${definition.baseModuleId}" is not installed.`,
      );
    }
    if (!baseModule.definition.eligibleAreas.includes(definition.area)) {
      throw new Error(
        `Area "${definition.area}" base module "${definition.baseModuleId}" is not eligible.`,
      );
    }
    if (baseModule.definition.kind !== "module") {
      throw new Error(
        `Area "${definition.area}" base owner "${definition.baseModuleId}" must be a module contribution.`,
      );
    }
    normalizeRequiredKey(definition.shellPresetKey, `${definition.area} shell preset key`);
    const navKeys = new Set<string>();
    for (const surface of definition.navigationSurfaces ?? []) {
      if (surface.navKey !== surface.navKey.trim().toLowerCase()) {
        throw new Error(`Area "${definition.area}" navigation key "${surface.navKey}" must be normalized.`);
      }
      if (surface.navKey.indexOf(":", surface.navKey.indexOf(":") + 1) !== -1) {
        throw new Error(`Area "${definition.area}" navigation key "${surface.navKey}" has too many segments.`);
      }
      if (!surface.navKey.startsWith(`${definition.area}:`)) {
        throw new Error(
          `Area "${definition.area}" navigation key "${surface.navKey}" must use its Area prefix.`,
        );
      }
      if (navKeys.has(surface.navKey)) {
        throw new Error(`Area "${definition.area}" declares duplicate navKey "${surface.navKey}".`);
      }
      navKeys.add(surface.navKey);
      normalizeRequiredKey(surface.label.defaultMessage, `${surface.navKey} default label`);
      const itemKeys = collectNavigationItemKeys(surface.items, surface.navKey);
      const exportedItemKeys = new Set<string>();
      for (const itemKey of surface.exportedItemKeys ?? []) {
        if (!itemKeys.has(itemKey)) {
          throw new Error(`${surface.navKey}: exported item "${itemKey}" does not exist.`);
        }
        if (exportedItemKeys.has(itemKey)) {
          throw new Error(`${surface.navKey}: duplicate exported item "${itemKey}".`);
        }
        exportedItemKeys.add(itemKey);
      }
    }
    const routeMountKeys = new Set<string>();
    const routeMountPaths = new Set<string>();
    for (const mount of definition.routeMounts ?? []) {
      if (
        !PHI_ROUTE_MOUNT_KEY_PATTERN.test(mount.mountKey) ||
        routeMountKeys.has(mount.mountKey)
      ) {
        throw new Error(
          `Area "${definition.area}" declares invalid or duplicate route mount "${mount.mountKey}".`,
        );
      }
      routeMountKeys.add(mount.mountKey);
      const basePath = normalizePhiCmsRoutePath(mount.basePath);
      if (basePath !== mount.basePath || routeMountPaths.has(basePath)) {
        throw new Error(
          `Area "${definition.area}" route mount "${mount.mountKey}" has an invalid or duplicate base path.`,
        );
      }
      routeMountPaths.add(basePath);
      const surface = (definition.navigationSurfaces ?? []).find(
        (candidate) => candidate.navKey === mount.navKey,
      );
      if (!surface) {
        throw new Error(
          `Area "${definition.area}" route mount "${mount.mountKey}" references ` +
          `unknown navigation surface "${mount.navKey}".`,
        );
      }
      if (!(surface.exportedItemKeys ?? []).includes(mount.parentItemKey)) {
        throw new Error(
          `Area "${definition.area}" route mount "${mount.mountKey}" parent ` +
          `"${mount.parentItemKey}" is not exported.`,
        );
      }
      const parent = findNavigationItemDescriptor(surface.items, mount.parentItemKey);
      if (!parent || parent.routePresetKey) {
        throw new Error(
          `Area "${definition.area}" route mount "${mount.mountKey}" parent ` +
          `"${mount.parentItemKey}" must be a navigation container.`,
        );
      }
    }
    definitionsByArea.set(definition.area, definition);
  }
  return definitionsByArea;
}

export function compilePhiCmsDescriptorCatalog({
  catalog,
  areaDefinitions,
}: {
  catalog: PhiRuntimeModuleCatalog;
  areaDefinitions: readonly PhiCmsAreaDefinition[];
}): PhiCmsCompiledDescriptorCatalog {
  const definitionsByArea = assertAreaDefinitions(areaDefinitions, catalog);
  const areaShellByArea = new Map<PhiCmsAreaKey, PhiCmsAreaShellPresetBinding>();
  const areaShellByIdentity = new Map<string, PhiCmsAreaShellPresetBinding>();
  const areaOverlaysByArea = new Map<PhiCmsAreaKey, PhiCmsAreaOverlayPresetDescriptor[]>();
  const routeByIdentity = new Map<string, PhiCmsRoutePresetDescriptor>();
  /**
   * Navigation injections a Module contributes without owning a Page, keyed by Area.
   *
   * Same descriptor and same rules as a route-attached injection; only the origin differs, which is
   * why the validation below walks one list of contributions rather than two.
   */
  const moduleNavigationByArea = new Map<PhiCmsAreaKey, {
    ownerModuleId: PhiRuntimeModuleId;
    descriptor: PhiCmsNavigationInjectionDescriptor;
  }[]>();
  const routesByArea = new Map<PhiCmsAreaKey, PhiCmsCompiledRoutePattern[]>();
  const routeOwnerByAreaPageKey = new Map<string, string>();
  const themeByKey = new Map<string, PhiCmsThemePresetBinding>();

  for (const [moduleId, entry] of catalog) {
    const descriptorKeys = new Set<string>();
    const registerIdentity = (presetKey: string) => {
      normalizeRequiredKey(presetKey, `${moduleId} preset key`);
      if (descriptorKeys.has(presetKey)) {
        throw new Error(`${moduleId}: duplicate preset key "${presetKey}".`);
      }
      descriptorKeys.add(presetKey);
      return buildPhiCmsPresetIdentityKey(moduleId, presetKey);
    };

    for (const descriptor of entry.areaShells ?? []) {
      if (descriptor.ownerModuleId !== moduleId) {
        throw new Error(`${moduleId}: shell preset "${descriptor.presetKey}" has a different owner.`);
      }
      assertPositiveVersion(
        descriptor.shellPresetVersion,
        `${moduleId}/${descriptor.presetKey} shellPresetVersion`,
      );
      const areaDefinition = definitionsByArea.get(descriptor.area);
      if (!areaDefinition) {
        throw new Error(`${moduleId}/${descriptor.presetKey}: Area "${descriptor.area}" is not declared.`);
      }
      if (!entry.definition.eligibleAreas.includes(descriptor.area)) {
        throw new Error(
          `${moduleId}/${descriptor.presetKey}: owner module is not eligible for Area "${descriptor.area}".`,
        );
      }
      if (
        areaDefinition.baseModuleId !== moduleId ||
        areaDefinition.shellPresetKey !== descriptor.presetKey
      ) {
        throw new Error(
          `${moduleId}/${descriptor.presetKey}: shell preset does not match Area "${descriptor.area}" base definition.`,
        );
      }
      const identity = registerIdentity(descriptor.presetKey);
      if (areaShellByArea.has(descriptor.area)) {
        throw new Error(`Area "${descriptor.area}" has more than one shell preset.`);
      }
      const binding = { descriptor };
      areaShellByArea.set(descriptor.area, binding);
      areaShellByIdentity.set(identity, binding);
    }

    for (const descriptor of entry.areaOverlays ?? []) {
      if (descriptor.ownerModuleId !== moduleId) {
        throw new Error(`${moduleId}: Area Overlay preset "${descriptor.presetKey}" has a different owner.`);
      }
      assertPositiveVersion(
        descriptor.presetVersion,
        `${moduleId}/${descriptor.presetKey} presetVersion`,
      );
      if (!definitionsByArea.has(descriptor.area)) {
        throw new Error(`${moduleId}/${descriptor.presetKey}: Area "${descriptor.area}" is not declared.`);
      }
      if (!entry.definition.eligibleAreas.includes(descriptor.area)) {
        throw new Error(
          `${moduleId}/${descriptor.presetKey}: owner module is not eligible for Area "${descriptor.area}".`,
        );
      }
      registerIdentity(descriptor.presetKey);
      const descriptors = areaOverlaysByArea.get(descriptor.area) ?? [];
      descriptors.push(descriptor);
      areaOverlaysByArea.set(descriptor.area, descriptors);
    }

    for (const descriptor of entry.navigation ?? []) {
      const area = descriptor.navKey.split(":")[0];
      if (!isPhiCmsAreaKey(area) || !definitionsByArea.has(area)) {
        throw new Error(`${moduleId}: navigation "${descriptor.navKey}" names no declared Area.`);
      }
      if (!entry.definition.eligibleAreas.includes(area)) {
        throw new Error(
          `${moduleId}: navigation "${descriptor.navKey}" is in an Area the Module is not eligible for.`,
        );
      }
      const contributions = moduleNavigationByArea.get(area) ?? [];
      contributions.push({ ownerModuleId: moduleId, descriptor });
      moduleNavigationByArea.set(area, contributions);
    }

    for (const descriptor of entry.routes ?? []) {
      if (descriptor.ownerModuleId !== moduleId) {
        throw new Error(`${moduleId}: route preset "${descriptor.presetKey}" has a different owner.`);
      }
      const areaDefinition = definitionsByArea.get(descriptor.area);
      if (!areaDefinition) {
        throw new Error(`${moduleId}/${descriptor.presetKey}: Area "${descriptor.area}" is not declared.`);
      }
      assertPositiveVersion(descriptor.presetVersion, `${moduleId}/${descriptor.presetKey} presetVersion`);
      normalizeRequiredKey(descriptor.pageKey, `${moduleId}/${descriptor.presetKey} page key`);
      normalizeRequiredKey(descriptor.title, `${moduleId}/${descriptor.presetKey} title`);
      const areaPageKey = `${descriptor.area}\u001f${descriptor.pageKey}`;
      const currentPageKeyOwner = routeOwnerByAreaPageKey.get(areaPageKey);
      if (currentPageKeyOwner) {
        throw new Error(
          `Area "${descriptor.area}" page key "${descriptor.pageKey}" is owned by both ` +
          `"${currentPageKeyOwner}" and "${moduleId}/${descriptor.presetKey}".`,
        );
      }
      routeOwnerByAreaPageKey.set(areaPageKey, `${moduleId}/${descriptor.presetKey}`);
      const identity = registerIdentity(descriptor.presetKey);
      if (!entry.definition.eligibleAreas.includes(descriptor.area)) {
        throw new Error(
          `${moduleId}/${descriptor.presetKey}: owner module is not eligible for Area "${descriptor.area}".`,
        );
      }
      const resolvedDescriptor = resolvePhiCmsMountedRouteDescriptor(descriptor, areaDefinition);
      const compiled = compilePhiCmsRoutePattern(resolvedDescriptor);
      routeByIdentity.set(identity, resolvedDescriptor);
      const areaRoutes = routesByArea.get(descriptor.area) ?? [];
      areaRoutes.push(compiled);
      routesByArea.set(descriptor.area, areaRoutes);
    }

    for (const descriptor of entry.themes ?? []) {
      if (descriptor.ownerModuleId !== moduleId) {
        throw new Error(`${moduleId}: theme preset "${descriptor.presetKey}" has a different owner.`);
      }
      assertPositiveVersion(descriptor.presetVersion, `${moduleId}/${descriptor.presetKey} presetVersion`);
      normalizeRequiredKey(descriptor.themeKey, `${moduleId}/${descriptor.presetKey} theme key`);
      normalizeRequiredKey(descriptor.title, `${moduleId}/${descriptor.presetKey} title`);
      registerIdentity(descriptor.presetKey);
      if (themeByKey.has(descriptor.themeKey)) {
        throw new Error(`Duplicate theme preset key "${descriptor.themeKey}".`);
      }
      themeByKey.set(descriptor.themeKey, { descriptor });
    }
  }

  for (const [area, definition] of definitionsByArea) {
    if (!areaShellByArea.has(area)) {
      throw new Error(
        `Area "${area}" is missing shell preset "${definition.baseModuleId}/${definition.shellPresetKey}".`,
      );
    }
    for (const mount of definition.routeMounts ?? []) {
      const baseRoute = (routesByArea.get(area) ?? []).find(
        (pattern) =>
          pattern.descriptor.ownerModuleId === definition.baseModuleId &&
          pattern.descriptor.path === mount.basePath,
      );
      if (!baseRoute || baseRoute.parameterName !== null) {
        throw new Error(
          `Area "${area}" route mount "${mount.mountKey}" requires exact base route ` +
          `"${definition.baseModuleId}:${mount.basePath}".`,
        );
      }
    }
  }

  for (const binding of areaShellByIdentity.values()) {
    const descriptor = binding.descriptor;
    const exportedNodeKeys = new Set<string>();
    for (const nodeKey of descriptor.exportedNodeKeys ?? []) {
      normalizeRequiredKey(nodeKey, `${descriptor.ownerModuleId}/${descriptor.presetKey} exported node key`);
      if (exportedNodeKeys.has(nodeKey)) {
        throw new Error(
          `${descriptor.ownerModuleId}/${descriptor.presetKey}: duplicate exported node key "${nodeKey}".`,
        );
      }
      exportedNodeKeys.add(nodeKey);
    }
    const sourceKeys = new Set<string>();
    for (const source of descriptor.composition ?? []) {
      const sourceIdentity = buildPhiCmsPresetIdentityKey(source.ownerModuleId, source.presetKey);
      if (sourceKeys.has(sourceIdentity)) {
        throw new Error(
          `${descriptor.ownerModuleId}/${descriptor.presetKey}: duplicate shell composition source.`,
        );
      }
      sourceKeys.add(sourceIdentity);
      const sourceBinding = areaShellByIdentity.get(sourceIdentity);
      if (!sourceBinding) {
        throw new Error(
          `${descriptor.ownerModuleId}/${descriptor.presetKey}: unresolved shell composition source ` +
          `"${source.ownerModuleId}/${source.presetKey}".`,
        );
      }
      const sourceExportedNodeKeys = new Set(sourceBinding.descriptor.exportedNodeKeys ?? []);
      for (const regionType of source.omitRegionTypes ?? []) {
        if (!PHI_CMS_REGION_TYPE_VALUES.has(regionType)) {
          throw new Error(
            `${descriptor.ownerModuleId}/${descriptor.presetKey}: invalid omitted Region type "${String(regionType)}".`,
          );
        }
      }
      for (const nodeKey of source.omitNodeKeys ?? []) {
        if (!sourceExportedNodeKeys.has(nodeKey)) {
          throw new Error(
            `${descriptor.ownerModuleId}/${descriptor.presetKey}: node key "${nodeKey}" is not exported by ` +
            `"${source.ownerModuleId}/${source.presetKey}".`,
          );
        }
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visitShell = (identity: string) => {
    if (visiting.has(identity)) {
      throw new Error(`Area shell composition cycle detected at "${identity}".`);
    }
    if (visited.has(identity)) {
      return;
    }
    visiting.add(identity);
    const descriptor = areaShellByIdentity.get(identity)?.descriptor;
    for (const source of descriptor?.composition ?? []) {
      visitShell(buildPhiCmsPresetIdentityKey(source.ownerModuleId, source.presetKey));
    }
    visiting.delete(identity);
    visited.add(identity);
  };
  for (const identity of areaShellByIdentity.keys()) {
    visitShell(identity);
  }

  const routeDescriptors = [...routesByArea.values()].flat().map(({ descriptor }) => descriptor);
  const injectionKeysByOwnerAndSurface = new Map<string, Set<string>>();
  const allInjectionKeysBySurface = new Map<string, Set<string>>();
  const readInjectionOwnerKey = (ownerModuleId: PhiRuntimeModuleId, navKey: string) =>
    `${ownerModuleId}\u001f${navKey}`;
  const assertOwnedRouteReference = ({
    ownerModuleId,
    area,
    routePresetKey,
    label,
  }: {
    ownerModuleId: PhiRuntimeModuleId;
    area: PhiCmsAreaKey;
    routePresetKey: string;
    label: string;
  }) => {
    const route = routeByIdentity.get(buildPhiCmsPresetIdentityKey(ownerModuleId, routePresetKey));
    if (!route || route.area !== area) {
      throw new Error(`${label}: route preset "${routePresetKey}" is not owned in Area "${area}".`);
    }
  };
  const assertOwnedOverlayReference = ({
    ownerModuleId,
    area,
    overlayPresetKey,
    label,
  }: {
    ownerModuleId: PhiRuntimeModuleId;
    area: PhiCmsAreaKey;
    overlayPresetKey: string;
    label: string;
  }) => {
    const owned = (areaOverlaysByArea.get(area) ?? []).some(
      (descriptor) =>
        descriptor.ownerModuleId === ownerModuleId && descriptor.presetKey === overlayPresetKey,
    );
    if (!owned) {
      throw new Error(
        `${label}: Overlay preset "${overlayPresetKey}" is not owned in Area "${area}".`,
      );
    }
  };
  const visitNavigationRouteReferences = (
    items: readonly (PhiCmsNavigationBaseItemDescriptor | PhiCmsNavigationInjectionItemDescriptor)[],
    ownerModuleId: PhiRuntimeModuleId,
    area: PhiCmsAreaKey,
    label: string,
  ) => {
    for (const item of items) {
      if (item.routePresetKey && item.overlayPresetKey) {
        throw new Error(
          `${label}/${item.itemKey}: an item goes to a route or opens an Overlay, never both.`,
        );
      }
      if (item.overlayPresetKey && !item.overlayNodeKey) {
        throw new Error(
          `${label}/${item.itemKey}: an Overlay reference needs both a preset key and a node key.`,
        );
      }
      if (item.routePresetKey) {
        assertOwnedRouteReference({
          ownerModuleId,
          area,
          routePresetKey: item.routePresetKey,
          label: `${label}/${item.itemKey}`,
        });
      }
      if (item.overlayPresetKey) {
        assertOwnedOverlayReference({
          ownerModuleId,
          area,
          overlayPresetKey: item.overlayPresetKey,
          label: `${label}/${item.itemKey}`,
        });
      }
      visitNavigationRouteReferences(item.children ?? [], ownerModuleId, area, label);
    }
  };

  for (const definition of definitionsByArea.values()) {
    for (const surface of definition.navigationSurfaces ?? []) {
      visitNavigationRouteReferences(
        surface.items,
        definition.baseModuleId,
        definition.area,
        surface.navKey,
      );
    }
  }

  const navigationContributions: {
    ownerModuleId: PhiRuntimeModuleId;
    area: PhiCmsAreaKey;
    label: string;
    injection: PhiCmsNavigationInjectionDescriptor;
  }[] = [
    ...routeDescriptors.flatMap((route) => (route.navigation ?? []).map((injection) => ({
      ownerModuleId: route.ownerModuleId,
      area: route.area,
      label: `${route.ownerModuleId}/${route.presetKey}`,
      injection,
    }))),
    ...[...moduleNavigationByArea.entries()].flatMap(([area, contributions]) =>
      contributions.map(({ ownerModuleId, descriptor }) => ({
        ownerModuleId,
        area,
        label: ownerModuleId,
        injection: descriptor,
      }))),
  ];

  for (const { ownerModuleId: contributorId, area: contributionArea, label: contributionLabel, injection } of navigationContributions) {
    const areaDefinition = definitionsByArea.get(contributionArea)!;
    const surfacesByKey = new Map(
      (areaDefinition.navigationSurfaces ?? []).map((surface) => [surface.navKey, surface]),
    );
    {
      const surface = surfacesByKey.get(injection.navKey);
      if (!surface) {
        throw new Error(
          `${contributionLabel}: navigation surface "${injection.navKey}" is not declared.`,
        );
      }
      if (injection.before && injection.after) {
        throw new Error(
          `${contributionLabel}: navigation injection cannot set before and after.`,
        );
      }
      if (
        contributorId !== areaDefinition.baseModuleId &&
        injection.parentItemKey === null &&
        !injection.before &&
        !injection.after
      ) {
        throw new Error(
          `${contributionLabel}: root navigation injection must reference a before or after anchor.`,
        );
      }
      const itemKeys = collectNavigationItemKeys(
        [injection.item],
        `${contributionLabel}/${injection.navKey}`,
      );
      const allSurfaceKeys = allInjectionKeysBySurface.get(injection.navKey) ?? new Set<string>();
      for (const itemKey of itemKeys) {
        if (allSurfaceKeys.has(itemKey)) {
          throw new Error(`${injection.navKey}: duplicate injected item key "${itemKey}".`);
        }
        allSurfaceKeys.add(itemKey);
      }
      allInjectionKeysBySurface.set(injection.navKey, allSurfaceKeys);
      const ownerKey = readInjectionOwnerKey(contributorId, injection.navKey);
      const ownerKeys = injectionKeysByOwnerAndSurface.get(ownerKey) ?? new Set<string>();
      for (const itemKey of itemKeys) {
        ownerKeys.add(itemKey);
      }
      injectionKeysByOwnerAndSurface.set(ownerKey, ownerKeys);
      visitNavigationRouteReferences(
        [injection.item],
        contributorId,
        contributionArea,
        `${contributionLabel}/${injection.navKey}`,
      );
    }
  }

  // Anchors are checked once every injection key is known, so a Module may anchor on its own item as
  // well as on an exported base one -- which is what lets a Module contribute a small subtree.
  for (const { ownerModuleId: contributorId, area: contributionArea, label: contributionLabel, injection } of navigationContributions) {
    const areaDefinition = definitionsByArea.get(contributionArea)!;
    const surfacesByKey = new Map(
      (areaDefinition.navigationSurfaces ?? []).map((surface) => [surface.navKey, surface]),
    );
    const surface = surfacesByKey.get(injection.navKey)!;
    const baseItemKeys = collectNavigationItemKeys(surface.items, surface.navKey);
    const exportedItemKeys = new Set(surface.exportedItemKeys ?? []);
    const ownItemKeys = injectionKeysByOwnerAndSurface.get(
      readInjectionOwnerKey(contributorId, injection.navKey),
    ) ?? new Set<string>();
    const assertAnchor = (itemKey: string | null | undefined, label: string) => {
      if (itemKey == null) {
        return;
      }
      const baseAnchorAllowed = contributorId === areaDefinition.baseModuleId
        ? baseItemKeys.has(itemKey)
        : exportedItemKeys.has(itemKey);
      if (!baseAnchorAllowed && !ownItemKeys.has(itemKey)) {
        throw new Error(
          `${contributionLabel}: ${label} "${itemKey}" is not an exported base or same-module item.`,
        );
      }
    };
    assertAnchor(injection.parentItemKey, "parent item");
    assertAnchor(injection.before, "before anchor");
    assertAnchor(injection.after, "after anchor");
  }

  return {
    areaDefinitions: definitionsByArea,
    areaShellByArea,
    areaShellByIdentity,
    areaOverlaysByArea,
    moduleNavigationByArea,
    routeByIdentity,
    routesByArea,
    themeByKey,
  };
}

const descriptorCatalogByRuntimeCatalog = new WeakMap<
  PhiRuntimeModuleCatalog,
  PhiCmsCompiledDescriptorCatalog
>();

export function resolvePhiCmsDescriptorCatalog(catalog: PhiRuntimeModuleCatalog) {
  const current = descriptorCatalogByRuntimeCatalog.get(catalog);
  if (current) {
    return current;
  }
  const compiled = compilePhiCmsDescriptorCatalog({
    catalog,
    areaDefinitions: catalog.areaDefinitions,
  });
  descriptorCatalogByRuntimeCatalog.set(catalog, compiled);
  return compiled;
}

export function compilePhiCmsActiveRouteTable({
  catalog,
  area,
  activeModuleIds,
  viewer,
}: {
  catalog: PhiCmsCompiledDescriptorCatalog;
  area: PhiCmsAreaKey;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  viewer?: PhiAccessViewer;
}): PhiCmsActiveRouteTable {
  const areaDefinition = catalog.areaDefinitions.get(area);
  if (!areaDefinition) {
    throw new Error(`Area "${area}" is not declared.`);
  }
  if (!activeModuleIds.has(areaDefinition.baseModuleId)) {
    throw new Error(`Area "${area}" base module "${areaDefinition.baseModuleId}" is not active.`);
  }
  const byPageKey = new Map<string, PhiCmsRoutePresetDescriptor>();
  const exactByPath = new Map<string, PhiCmsRoutePresetDescriptor>();
  const dynamic: PhiCmsCompiledRoutePattern[] = [];
  for (const pattern of catalog.routesByArea.get(area) ?? []) {
    if (!activeModuleIds.has(pattern.descriptor.ownerModuleId)) {
      continue;
    }
    if (viewer && !canPhiViewerAccess(viewer, pattern.descriptor.accessPolicy)) {
      continue;
    }
    const currentPage = byPageKey.get(pattern.descriptor.pageKey);
    if (currentPage) {
      throw new Error(
        `Active Page collision at "${area}:${pattern.descriptor.pageKey}" between ` +
        `"${currentPage.ownerModuleId}/${currentPage.presetKey}" and ` +
        `"${pattern.descriptor.ownerModuleId}/${pattern.descriptor.presetKey}".`,
      );
    }
    byPageKey.set(pattern.descriptor.pageKey, pattern.descriptor);
    if (pattern.parameterName === null) {
      const current = exactByPath.get(pattern.descriptor.path);
      if (current) {
        throw new Error(
          `Active route collision at "${area}:${pattern.descriptor.path}" between ` +
          `"${current.ownerModuleId}/${current.presetKey}" and ` +
          `"${pattern.descriptor.ownerModuleId}/${pattern.descriptor.presetKey}".`,
        );
      }
      exactByPath.set(pattern.descriptor.path, pattern.descriptor);
      continue;
    }
    const overlap = dynamic.find((candidate) => routePatternsOverlap(candidate, pattern));
    if (overlap) {
      throw new Error(
        `Active dynamic route collision in Area "${area}" between ` +
        `"${overlap.descriptor.path}" and "${pattern.descriptor.path}".`,
      );
    }
    dynamic.push(pattern);
  }
  return { area, byPageKey, exactByPath, dynamic };
}

type ResolvedNavigationNode = {
  item: PhiCmsResolvedNavigationItem;
  definitionItemKey: string;
  intrinsicChildren: ResolvedNavigationNode[];
  injection: {
    descriptor: PhiCmsNavigationInjectionDescriptor;
    /** Absent for a Module-level contribution, which has no Page to come from. */
    route: PhiCmsRoutePresetDescriptor | null;
    sortKey: string;
  } | null;
};

function resolveNavigationTarget(
  catalog: PhiCmsCompiledDescriptorCatalog,
  ownerModuleId: PhiRuntimeModuleId,
  routePresetKey: string | undefined,
  overlay?: { presetKey: string; nodeKey: string } | null,
) {
  if (overlay) {
    // No path and no lookup against the route table: the item opens something that is already in the
    // Area tree. Ownership was checked when the surface was compiled.
    return {
      kind: "overlay" as const,
      ownerModuleId,
      presetKey: overlay.presetKey,
      nodeKey: overlay.nodeKey,
    };
  }
  if (!routePresetKey) {
    return null;
  }
  const route = resolvePhiCmsRoutePresetByIdentity(catalog, ownerModuleId, routePresetKey);
  if (!route) {
    throw new Error(
      `Navigation item references missing route preset "${ownerModuleId}/${routePresetKey}".`,
    );
  }
  return {
    kind: "module" as const,
    ownerModuleId,
    presetKey: route.presetKey,
    path: route.path,
  };
}

function buildResolvedNavigationNode(
  catalog: PhiCmsCompiledDescriptorCatalog,
  navKey: string,
  ownerModuleId: PhiRuntimeModuleId,
  descriptor: PhiCmsNavigationBaseItemDescriptor | PhiCmsNavigationInjectionItemDescriptor,
  injection: ResolvedNavigationNode["injection"],
): ResolvedNavigationNode {
  const target = resolveNavigationTarget(
    catalog,
    ownerModuleId,
    descriptor.routePresetKey,
    descriptor.overlayPresetKey && descriptor.overlayNodeKey
      ? { presetKey: descriptor.overlayPresetKey, nodeKey: descriptor.overlayNodeKey }
      : null,
  );
  const intrinsicChildren = (descriptor.children ?? []).map((child) =>
    buildResolvedNavigationNode(catalog, navKey, ownerModuleId, child, null),
  );
  return {
    item: {
      id: createPhiPresetCmsInstanceId({
        domain: "navigation",
        ownerModuleId,
        presetKey: navKey,
        nodeKey: descriptor.itemKey,
      }),
      ownerModuleId,
      kind: target ? "link" : "container",
      label: descriptor.label,
      ...(descriptor.icon ? { icon: descriptor.icon } : {}),
      ...(descriptor.accessPolicy ? { accessPolicy: descriptor.accessPolicy } : {}),
      target,
      children: [],
    },
    definitionItemKey: descriptor.itemKey,
    intrinsicChildren,
    injection,
  };
}

function orderNavigationSiblings(
  intrinsic: readonly ResolvedNavigationNode[],
  injected: readonly ResolvedNavigationNode[],
  parentItemKey: string | null,
) {
  const ordered = [...intrinsic];
  const pending = [...injected].sort((left, right) =>
    left.injection!.sortKey.localeCompare(right.injection!.sortKey),
  );

  while (pending.length > 0) {
    let inserted = false;
    const anchors = new Map<string, {
      before: ResolvedNavigationNode[];
      after: ResolvedNavigationNode[];
    }>();
    const unanchored: ResolvedNavigationNode[] = [];
    for (const node of pending) {
      const descriptor = node.injection!.descriptor;
      const anchor = descriptor.before ?? descriptor.after ?? null;
      if (!anchor) {
        unanchored.push(node);
        continue;
      }
      const group = anchors.get(anchor) ?? { before: [], after: [] };
      group[descriptor.before ? "before" : "after"].push(node);
      anchors.set(anchor, group);
    }

    for (const [anchor, group] of [...anchors].sort(([left], [right]) => left.localeCompare(right))) {
      let anchorIndex = ordered.findIndex((node) => node.definitionItemKey === anchor);
      if (anchorIndex < 0) {
        continue;
      }
      ordered.splice(anchorIndex, 0, ...group.before);
      anchorIndex += group.before.length;
      ordered.splice(anchorIndex + 1, 0, ...group.after);
      for (const node of [...group.before, ...group.after]) {
        pending.splice(pending.indexOf(node), 1);
      }
      inserted = true;
    }

    if (unanchored.length > 0) {
      ordered.push(...unanchored);
      for (const node of unanchored) {
        pending.splice(pending.indexOf(node), 1);
      }
      inserted = true;
    }

    if (!inserted) {
      const unresolved = pending.map((node) => {
        const descriptor = node.injection!.descriptor;
        return descriptor.before ?? descriptor.after ?? node.definitionItemKey;
      });
      throw new Error(
        `Navigation injections below "${parentItemKey ?? "root"}" have unresolved or cyclic anchors: ${unresolved.join(", ")}.`,
      );
    }
  }

  return ordered;
}

export function resolvePhiCmsActiveNavigationSurfaces({
  catalog,
  area,
  activeModuleIds,
  viewer,
}: {
  catalog: PhiCmsCompiledDescriptorCatalog;
  area: PhiCmsAreaKey;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  viewer?: PhiAccessViewer;
}): readonly PhiCmsResolvedNavigationSurface[] {
  const definition = catalog.areaDefinitions.get(area);
  if (!definition) {
    throw new Error(`Area "${area}" is not declared.`);
  }
  if (!activeModuleIds.has(definition.baseModuleId)) {
    throw new Error(`Area "${area}" base module "${definition.baseModuleId}" is not active.`);
  }

  const activeRoutes = (catalog.routesByArea.get(area) ?? [])
    .map(({ descriptor }) => descriptor)
    .filter(({ ownerModuleId }) => activeModuleIds.has(ownerModuleId))
    .filter((route) => !viewer || canPhiViewerAccess(viewer, route.accessPolicy));
  const canAccessNavigationNode = (node: ResolvedNavigationNode) => {
    if (!viewer) {
      return true;
    }
    const routePolicy = node.item.target?.kind === "module"
      ? catalog.routeByIdentity.get(buildPhiCmsPresetIdentityKey(
          node.item.target.ownerModuleId,
          node.item.target.presetKey,
        ))?.accessPolicy
      : undefined;
    return canPhiViewerAccess(viewer, node.item.accessPolicy ?? routePolicy);
  };

  return (definition.navigationSurfaces ?? []).map((surface) => {
    const roots = surface.items
      .map((item) => buildResolvedNavigationNode(catalog, surface.navKey, definition.baseModuleId, item, null))
      .filter(canAccessNavigationNode);
    const injectedRoots: ResolvedNavigationNode[] = [];
    const injectedByParent = new Map<string, ResolvedNavigationNode[]>();
    const nodesByKey = new Map<string, ResolvedNavigationNode>();
    const registerNode = (node: ResolvedNavigationNode) => {
      if (nodesByKey.has(node.definitionItemKey)) {
        throw new Error(`${surface.navKey}: duplicate active item key "${node.definitionItemKey}".`);
      }
      nodesByKey.set(node.definitionItemKey, node);
      node.intrinsicChildren.forEach(registerNode);
    };
    roots.forEach(registerNode);

    const activeContributions = [
      ...activeRoutes.flatMap((route) => (route.navigation ?? []).map((descriptor) => ({
        ownerModuleId: route.ownerModuleId,
        route: route as PhiCmsRoutePresetDescriptor | null,
        // Preset key in the sort key so two entries from one Module stay in a stable order.
        sortKey: `${route.ownerModuleId}\u001f${route.presetKey}\u001f${descriptor.item.itemKey}`,
        descriptor,
      }))),
      ...(catalog.moduleNavigationByArea.get(area) ?? [])
        .filter(({ ownerModuleId }) => activeModuleIds.has(ownerModuleId))
        .map(({ ownerModuleId, descriptor }) => ({
          ownerModuleId,
          route: null as PhiCmsRoutePresetDescriptor | null,
          // No preset segment: the contribution belongs to the Module itself.
          sortKey: `${ownerModuleId}\u001f\u001f${descriptor.item.itemKey}`,
          descriptor,
        })),
    ];

    {
      for (const { ownerModuleId: contributorId, route, sortKey, descriptor } of activeContributions) {
        if (descriptor.navKey !== surface.navKey) {
          continue;
        }
        const node = buildResolvedNavigationNode(catalog, surface.navKey, contributorId, descriptor.item, {
          descriptor,
          route,
          sortKey,
        });
        registerNode(node);
        if (descriptor.parentItemKey === null) {
          injectedRoots.push(node);
        } else {
          const siblings = injectedByParent.get(descriptor.parentItemKey) ?? [];
          siblings.push(node);
          injectedByParent.set(descriptor.parentItemKey, siblings);
        }
      }
    }

    for (const parentItemKey of injectedByParent.keys()) {
      if (!nodesByKey.has(parentItemKey)) {
        throw new Error(
          `${surface.navKey}: active navigation parent "${parentItemKey}" is unavailable.`,
        );
      }
    }

    const materialize = (
      intrinsic: readonly ResolvedNavigationNode[],
      injected: readonly ResolvedNavigationNode[],
      parentItemKey: string | null,
    ): readonly PhiCmsResolvedNavigationItem[] =>
      orderNavigationSiblings(intrinsic, injected, parentItemKey)
        .filter(canAccessNavigationNode)
        .map((node) => ({
        ...node.item,
        children: materialize(
          node.intrinsicChildren,
          injectedByParent.get(node.definitionItemKey) ?? [],
          node.definitionItemKey,
        ),
        }));

    return {
      area,
      navKey: surface.navKey,
      label: surface.label,
      items: materialize(roots, injectedRoots, null),
    };
  });
}

export function resolvePhiCmsNavigationOverlay(
  surface: PhiCmsResolvedNavigationSurface,
  overlay: PhiCmsNavigationOverlay | null,
): PhiCmsNavigationOverlayResolution {
  if (!overlay) {
    return { surface, diagnostics: [] };
  }
  if (overlay.navKey !== surface.navKey) {
    throw new Error(
      `Navigation overlay "${overlay.navKey}" cannot be applied to "${surface.navKey}".`,
    );
  }

  type MutableItem = Omit<PhiCmsResolvedNavigationItem, "children"> & { children: MutableItem[] };
  const cloneItem = (item: PhiCmsResolvedNavigationItem): MutableItem => ({
    ...item,
    children: item.children.map(cloneItem),
  });
  const roots = surface.items.map(cloneItem);
  const diagnostics: PhiCmsNavigationOverlayDiagnostic[] = [];
  const allById = new Map<PhiCmsResolvedNavigationItem["id"], MutableItem>();
  const register = (item: MutableItem) => {
    allById.set(item.id, item);
    item.children.forEach(register);
  };
  roots.forEach(register);

  for (const customItem of overlay.customItems) {
    if (allById.has(customItem.id)) {
      throw new Error(`Navigation custom item "${customItem.id}" conflicts with an active item.`);
    }
    const item: MutableItem = {
      id: customItem.id,
      ownerModuleId: null,
      kind: customItem.kind,
      label: { defaultMessage: customItem.label },
      ...(customItem.icon ? { icon: customItem.icon } : {}),
      target: customItem.kind === "link" && customItem.target?.kind === "external"
        ? {
            kind: "custom",
            path: customItem.target.href,
            external: true,
            ...(customItem.newTab === true ? { newTab: true } : {}),
          }
        : customItem.kind === "link" && customItem.target?.kind === "page" && customItem.target.resolvedPath
          ? {
              kind: "custom",
              path: customItem.target.resolvedPath,
              ...(customItem.newTab === true ? { newTab: true } : {}),
            }
          : null,
      children: [],
    };
    roots.push(item);
    register(item);
  }

  const placementOverrides = [
    ...overlay.itemOverrides,
    ...overlay.customItems.map((item) => ({
      id: item.id,
      placement: item.placement,
    })),
  ];
  const overrides = new Map(overlay.itemOverrides.map((entry) => [entry.id, entry]));
  for (const [id, override] of overrides) {
    const item = allById.get(id);
    if (!item) {
      diagnostics.push({ code: "unresolved-item", id });
      continue;
    }
    if (override.label !== undefined) {
      item.label = { ...item.label, defaultMessage: override.label };
    }
    if (override.icon !== undefined) {
      if (override.icon === null) {
        delete item.icon;
      } else {
        item.icon = override.icon;
      }
    }
  }

  const tombstones = new Set(overlay.tombstones);
  for (const id of tombstones) {
    if (!allById.has(id)) {
      diagnostics.push({ code: "unresolved-item", id });
    }
  }
  const originalPositions = new Map<
    PhiCmsResolvedNavigationItem["id"],
    { parentId: PhiCmsResolvedNavigationItem["id"] | null; index: number; order: number }
  >();
  let traversalOrder = 0;
  const indexItems = (items: MutableItem[], parentId: PhiCmsResolvedNavigationItem["id"] | null) => {
    items.forEach((item, index) => {
      originalPositions.set(item.id, { parentId, index, order: traversalOrder });
      traversalOrder += 1;
      indexItems(item.children, item.id);
    });
  };
  indexItems(roots, null);

  const placements = new Map<PhiCmsResolvedNavigationItem["id"], PhiCmsNavigationItemPlacement>();
  for (const override of placementOverrides) {
    if (!override.placement || !allById.has(override.id)) {
      continue;
    }
    const { parentId } = override.placement;
    const parent = parentId === null ? null : allById.get(parentId);
    if (parentId !== null && !parent) {
      diagnostics.push({ code: "unresolved-parent", id: override.id, referenceId: parentId });
      continue;
    }
    if (parent && parent.kind !== "container") {
      diagnostics.push({
        code: "invalid-placement",
        id: override.id,
        referenceId: parentId!,
      });
      continue;
    }
    placements.set(override.id, override.placement);
  }

  const resolveParentId = (id: PhiCmsResolvedNavigationItem["id"]) => {
    const placement = placements.get(id);
    return placement
      ? placement.parentId
      : originalPositions.get(id)?.parentId ?? null;
  };
  for (const [id, placement] of [...placements]) {
    let ancestorId = placement.parentId;
    const visited = new Set<PhiCmsResolvedNavigationItem["id"]>([id]);
    while (ancestorId !== null) {
      if (visited.has(ancestorId)) {
        diagnostics.push({
          code: "invalid-placement",
          id,
          referenceId: placement.parentId ?? undefined,
        });
        placements.delete(id);
        break;
      }
      visited.add(ancestorId);
      ancestorId = resolveParentId(ancestorId);
    }
  }

  const groups = new Map<PhiCmsResolvedNavigationItem["id"] | null, Array<{
    item: MutableItem;
    index: number;
    explicit: boolean;
    order: number;
  }>>();
  for (const [id, item] of allById) {
    const original = originalPositions.get(id)!;
    const placement = placements.get(id);
    const parentId = placement ? placement.parentId : original.parentId;
    const group = groups.get(parentId) ?? [];
    group.push({
      item,
      index: placement?.index ?? original.index,
      explicit: placement !== undefined,
      order: original.order,
    });
    groups.set(parentId, group);
    item.children = [];
  }
  for (const [parentId, entries] of groups) {
    entries.sort((left, right) =>
      left.index - right.index ||
      Number(right.explicit) - Number(left.explicit) ||
      left.order - right.order ||
      left.item.id.localeCompare(right.item.id),
    );
    const target = parentId === null ? roots : allById.get(parentId)!.children;
    target.splice(0, target.length, ...entries.map(({ item }) => item));
  }

  const removeTombstones = (items: MutableItem[]): MutableItem[] =>
    items
      .filter((item) => !tombstones.has(item.id))
      .map((item) => ({ ...item, children: removeTombstones(item.children) }));
  const visibleRoots = removeTombstones(roots);

  return {
    surface: {
      ...surface,
      ...(overlay.label ? { label: { ...surface.label, defaultMessage: overlay.label } } : {}),
      items: visibleRoots,
    },
    diagnostics,
  };
}

export function resolvePhiCmsRoutePreset(
  table: PhiCmsActiveRouteTable,
  requestedPath: string,
): PhiCmsRoutePresetBinding | null {
  const path = normalizePhiCmsRoutePath(requestedPath);
  const exact = table.exactByPath.get(path);
  if (exact) {
    return { descriptor: exact, params: {} };
  }
  const segments = path.split("/").filter(Boolean);
  for (const pattern of table.dynamic) {
    if (segments.length !== pattern.segments.length) {
      continue;
    }
    const params: Record<string, string> = {};
    let matches = true;
    for (let index = 0; index < segments.length; index += 1) {
      const expected = pattern.segments[index]!;
      const actual = segments[index]!;
      if (expected.startsWith(":")) {
        params[expected.slice(1)] = actual;
      } else if (expected !== actual) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return { descriptor: pattern.descriptor, params };
    }
  }
  return null;
}

export function resolvePhiCmsRoutePresetByPageKey(
  table: PhiCmsActiveRouteTable,
  pageKey: string,
): PhiCmsRoutePresetBinding | null {
  const descriptor = table.byPageKey.get(pageKey.trim());
  return descriptor ? { descriptor, params: {} } : null;
}

export function resolvePhiCmsAreaShellPresetBinding(
  catalog: PhiCmsCompiledDescriptorCatalog,
  area: PhiCmsAreaKey,
) {
  return catalog.areaShellByArea.get(area) ?? null;
}

export function resolvePhiCmsRoutePresetByIdentity(
  catalog: PhiCmsCompiledDescriptorCatalog,
  ownerModuleId: PhiRuntimeModuleId,
  presetKey: string,
) {
  return catalog.routeByIdentity.get(buildPhiCmsPresetIdentityKey(ownerModuleId, presetKey)) ?? null;
}

export function resolvePhiCmsThemePresetBinding(
  catalog: PhiCmsCompiledDescriptorCatalog,
  themeKey: string,
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>,
) {
  const binding = catalog.themeByKey.get(themeKey.trim()) ?? null;
  return binding && activeModuleIds.has(binding.descriptor.ownerModuleId) ? binding : null;
}

export async function instantiatePhiCmsThemePreset(binding: PhiCmsThemePresetBinding) {
  const preset = await binding.descriptor.loadPreset();
  if (preset.key !== binding.descriptor.themeKey || preset.title !== binding.descriptor.title) {
    throw new Error(
      `Theme preset "${binding.descriptor.ownerModuleId}/${binding.descriptor.presetKey}" metadata mismatch.`,
    );
  }
  return preset;
}

export async function instantiatePhiCmsThemePresets(
  catalog: PhiCmsCompiledDescriptorCatalog,
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>,
) {
  return Promise.all(
    [...catalog.themeByKey.values()]
      .filter((binding) => activeModuleIds.has(binding.descriptor.ownerModuleId))
      .map(instantiatePhiCmsThemePreset),
  );
}

function createSyntheticPresetPage({
  siteId,
  area,
  path,
}: {
  siteId: number;
  area: PhiCmsAreaKey;
  path: string;
}): PhiCmsPageNode {
  const areaMask = resolvePhiCmsAreaMask(area);
  return {
    id: -1,
    siteId,
    areaMask,
    path,
    pageType: PhiCmsPageType.Standard,
    status: PhiCmsStatus.Published,
    flags: 0,
    visibilityMask: areaMask,
    accessPolicy: PHI_VIEWER_ACCESS_ANYONE,
    titleMsgId: null,
    descriptionMsgId: null,
    heroRootLayoutNodeId: null,
    headerBottomRootLayoutNodeId: null,
    siderRightRootLayoutNodeId: null,
    footerTopRootLayoutNodeId: null,
    drawerRightRootLayoutNodeId: null,
    contentRootLayoutNodeId: null,
    layoutConfig: {},
  };
}

export function assertPhiCmsPresetTreeContract(
  tree: PhiResolvedCmsPageTree,
  expectedPage?: PhiCmsPageNode,
) {
  const layoutIds = new Set<string>();
  const allIds = new Set<string>();
  if (
    expectedPage &&
    (tree.page.siteId !== expectedPage.siteId ||
      tree.page.areaMask !== expectedPage.areaMask ||
      tree.page.path !== expectedPage.path)
  ) {
    throw new Error("Preset loader returned a Page outside its requested context.");
  }
  for (const node of tree.overlays) {
    if (!isPhiCmsInstanceId(node.id) || readPhiCmsInstanceIdDescriptor(node.id)?.origin !== "preset") {
      throw new Error(`Preset Overlay has invalid instance id "${String(node.id)}".`);
    }
    if (allIds.has(node.id)) {
      throw new Error(`Preset tree contains duplicate instance id "${node.id}".`);
    }
    allIds.add(node.id);
  }
  for (const node of tree.layoutNodes) {
    if (!isPhiCmsInstanceId(node.id) || readPhiCmsInstanceIdDescriptor(node.id)?.origin !== "preset") {
      throw new Error(`Preset layout node has invalid instance id "${String(node.id)}".`);
    }
    if (allIds.has(node.id)) {
      throw new Error(`Preset tree contains duplicate instance id "${node.id}".`);
    }
    allIds.add(node.id);
    layoutIds.add(node.id);
  }
  for (const node of tree.contentWidgets) {
    if (!isPhiCmsInstanceId(node.id) || readPhiCmsInstanceIdDescriptor(node.id)?.origin !== "preset") {
      throw new Error(`Preset widget node has invalid instance id "${String(node.id)}".`);
    }
    if (allIds.has(node.id)) {
      throw new Error(`Preset tree contains duplicate instance id "${node.id}".`);
    }
    allIds.add(node.id);
  }
  for (const node of tree.layoutNodes) {
    if (node.parentLayoutNodeId != null && !layoutIds.has(node.parentLayoutNodeId)) {
      throw new Error(`Preset layout "${node.id}" has unresolved parent "${node.parentLayoutNodeId}".`);
    }
  }
  for (const node of tree.contentWidgets) {
    if (!layoutIds.has(node.parentLayoutNodeId)) {
      throw new Error(`Preset widget "${node.id}" has unresolved parent "${node.parentLayoutNodeId}".`);
    }
  }
  for (const region of tree.regions) {
    if (expectedPage && region.pageId !== expectedPage.id) {
      throw new Error(`Preset region "${region.regionType}" belongs to a different Page.`);
    }
    if (!layoutIds.has(region.rootLayoutNodeId)) {
      throw new Error(`Preset region "${region.regionType}" has unresolved root "${region.rootLayoutNodeId}".`);
    }
  }
  const layoutsById = new Map(tree.layoutNodes.map((node) => [node.id, node]));
  for (const overlay of tree.overlays) {
    if (!layoutIds.has(overlay.bodyLayoutNodeId)) {
      throw new Error(`Preset Overlay "${overlay.id}" has unresolved Body root "${overlay.bodyLayoutNodeId}".`);
    }
    if (overlay.headerLayoutNodeId != null && !layoutIds.has(overlay.headerLayoutNodeId)) {
      throw new Error(`Preset Overlay "${overlay.id}" has unresolved Header root "${overlay.headerLayoutNodeId}".`);
    }
    if (overlay.footerPresentation === "none") {
      continue;
    }
    const footerLayout = layoutsById.get(overlay.footerLayoutNodeId);
    if (!footerLayout) {
      throw new Error(`Preset Overlay "${overlay.id}" has unresolved Footer root "${overlay.footerLayoutNodeId}".`);
    }
    if (overlay.footerPresentation === "actions") {
      if (footerLayout.widgetType !== PhiCmsLayoutType.Flex) {
        throw new Error(`Preset Overlay "${overlay.id}" actions Footer must use the Phi Flex Layout.`);
      }
      const expectedConfig = resolvePhiLayoutCreationPreset("flex", "overlay-actions");
      const mismatch = Object.entries(expectedConfig).find(([key, value]) =>
        JSON.stringify(footerLayout.config[key]) !== JSON.stringify(value));
      if (mismatch) {
        throw new Error(
          `Preset Overlay "${overlay.id}" actions Footer does not match the canonical Layout preset at "${mismatch[0]}".`,
        );
      }
    }
  }
  for (const rootLayoutNodeId of [
    tree.page.heroRootLayoutNodeId,
    tree.page.headerBottomRootLayoutNodeId,
    tree.page.siderRightRootLayoutNodeId,
    tree.page.footerTopRootLayoutNodeId,
    tree.page.drawerRightRootLayoutNodeId,
    tree.page.contentRootLayoutNodeId,
  ]) {
    if (rootLayoutNodeId != null && !layoutIds.has(rootLayoutNodeId)) {
      throw new Error(`Preset Page has unresolved root "${rootLayoutNodeId}".`);
    }
  }
}

function assertPhiCmsAreaOverlayTree(
  descriptor: PhiCmsAreaOverlayPresetDescriptor,
  tree: PhiResolvedCmsPageTree,
  page: PhiCmsPageNode,
) {
  assertPhiCmsPresetTreeContract(tree, page);
  if (tree.regions.length > 0) {
    throw new Error(
      `${descriptor.ownerModuleId}/${descriptor.presetKey}: Area Overlay preset must not contribute Regions.`,
    );
  }
  if (tree.overlays.length === 0) {
    throw new Error(
      `${descriptor.ownerModuleId}/${descriptor.presetKey}: Area Overlay preset must contribute an Overlay.`,
    );
  }
  for (const node of [...tree.overlays, ...tree.layoutNodes, ...tree.contentWidgets]) {
    if (readPhiCmsInstanceIdDescriptor(node.id)?.domain !== "area") {
      throw new Error(
        `${descriptor.ownerModuleId}/${descriptor.presetKey}: Area Overlay nodes require Area-domain instance ids.`,
      );
    }
  }
}

export async function composePhiCmsActiveAreaOverlayPresets({
  tree,
  catalog,
  activeModuleIds,
  siteId,
  area,
  path,
  runtime,
}: {
  tree: PhiResolvedCmsAreaPresetTree;
  catalog: PhiCmsCompiledDescriptorCatalog;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  siteId: number;
  area: PhiCmsAreaKey;
  path: string;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsAreaPresetTree> {
  const descriptors = (catalog.areaOverlaysByArea.get(area) ?? [])
    .filter((descriptor) => activeModuleIds.has(descriptor.ownerModuleId));
  if (descriptors.length === 0) return tree;

  const page = createSyntheticPresetPage({ siteId, area, path });
  const occupiedIds = new Set<string>([
    ...tree.overlays.map((node) => node.id),
    ...tree.layoutNodes.map((node) => node.id),
    ...tree.contentWidgets.map((node) => node.id),
  ]);
  const overlays = [...tree.overlays];
  const layoutNodes = [...tree.layoutNodes];
  const contentWidgets = [...tree.contentWidgets];

  for (const descriptor of descriptors) {
    const contribution = await descriptor.loadTree({
      page,
      runtime: resolveTargetRuntime(runtime, area),
      catalog,
    });
    assertPhiCmsAreaOverlayTree(descriptor, contribution, page);
    for (const node of [
      ...contribution.overlays,
      ...contribution.layoutNodes,
      ...contribution.contentWidgets,
    ]) {
      if (occupiedIds.has(node.id)) {
        throw new Error(`Area Overlay composition contains duplicate instance id "${node.id}".`);
      }
      occupiedIds.add(node.id);
    }
    overlays.push(...contribution.overlays);
    layoutNodes.push(...contribution.layoutNodes);
    contentWidgets.push(...contribution.contentWidgets);
  }

  return { ...tree, overlays, layoutNodes, contentWidgets };
}

function resolveTargetRuntime(runtime: PhiBlockRuntime, area: PhiCmsAreaKey): PhiBlockRuntime {
  return runtime.area === area ? runtime : { ...runtime, area };
}

async function loadShellTree(
  descriptor: PhiCmsAreaShellPresetDescriptor,
  catalog: PhiCmsCompiledDescriptorCatalog,
  page: PhiCmsPageNode,
  runtime: PhiBlockRuntime,
): Promise<PhiResolvedCmsPageTree> {
  let composedTree: PhiResolvedCmsPageTree | null = null;
  for (const source of descriptor.composition ?? []) {
    const sourceDescriptor = catalog.areaShellByIdentity.get(
      buildPhiCmsPresetIdentityKey(source.ownerModuleId, source.presetKey),
    )?.descriptor;
    if (!sourceDescriptor) {
      throw new Error(
        `${descriptor.ownerModuleId}/${descriptor.presetKey}: unresolved shell composition source.`,
      );
    }
    const sourceTree = omitPhiCmsShellCompositionNodes(
      await loadShellTree(sourceDescriptor, catalog, page, runtime),
      sourceDescriptor,
      source.omitRegionTypes ?? [],
      source.omitNodeKeys ?? [],
    );
    composedTree = composedTree ? mergePhiCmsShellTrees(composedTree, sourceTree) : sourceTree;
  }
  const ownTree = await descriptor.loadTree({ page, runtime, catalog });
  assertPhiCmsPresetTreeContract(ownTree, page);
  return composedTree ? mergePhiCmsShellTrees(composedTree, ownTree) : ownTree;
}

export async function instantiatePhiCmsAreaShellPreset({
  binding,
  catalog,
  siteId,
  path,
  runtime,
}: {
  binding: PhiCmsAreaShellPresetBinding;
  catalog: PhiCmsCompiledDescriptorCatalog;
  siteId: number;
  path: string;
  runtime: PhiBlockRuntime;
}) {
  const page = createSyntheticPresetPage({ siteId, area: binding.descriptor.area, path });
  const tree = await loadShellTree(
    binding.descriptor,
    catalog,
    page,
    resolveTargetRuntime(runtime, binding.descriptor.area),
  );
  assertPhiCmsPresetTreeContract(tree, page);
  return tree;
}

export async function instantiatePhiCmsRoutePreset({
  binding,
  catalog,
  activeModuleIds,
  siteId,
  path,
  runtime,
  resolveMissingPageTitle,
}: {
  binding: PhiCmsRoutePresetBinding;
  catalog: PhiCmsCompiledDescriptorCatalog;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  siteId: number;
  path: string;
  runtime: PhiBlockRuntime;
  resolveMissingPageTitle?: (sourceTitle: string) => string | Promise<string>;
}) {
  const descriptor = binding.descriptor;
  const page = createSyntheticPresetPage({ siteId, area: descriptor.area, path });
  const loadedTree = await descriptor.loadTree({
    page,
    runtime: resolveTargetRuntime(runtime, descriptor.area),
    catalog,
    activeModuleIds,
    params: binding.params,
  });
  const tree = loadedTree.pageMeta?.title
    ? loadedTree
    : {
        ...loadedTree,
        pageMeta: {
          title: {
            msgId: 0,
            source: descriptor.title,
            value: resolveMissingPageTitle
              ? (await resolveMissingPageTitle(descriptor.title)).trim() || descriptor.title
              : descriptor.title,
          },
          description: loadedTree.pageMeta?.description ?? null,
        },
      };
  assertPhiCmsPresetTreeContract(tree, page);
  return tree;
}
