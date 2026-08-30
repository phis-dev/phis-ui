import type { PhiControlPresentationConfig } from "./control";
import type { PhiCssLength } from "./length";
import type { PhiRuntimeDataProviderKey } from "./runtime-data-provider";
import type { PhiSignalRouteSet } from "./signals";
import type {
  PhiTableActionDefinition,
  PhiTableProviderBindingFieldDefinition,
  PhiTableProviderFieldDefinition,
  PhiTableQueryValue,
} from "./table-widget";
import type { PhiRuntimeConditionExpression } from "./runtime-condition";

export type PhiTreeNodeIdentity = string | number;
export type PhiTreeProviderFieldDefinition = PhiTableProviderFieldDefinition;
export type PhiTreeProviderActionCapability = {
  key: string;
  title: string;
  scope: "resource" | "node" | "selection";
  valueType?: "none" | "boolean" | "string" | "number" | "string[]" | "number[]" | "json";
  intent?: "read" | "write" | "destructive";
  confirmation?: "none" | "required";
  visibleWhen?: PhiRuntimeConditionExpression;
  disabledWhen?: PhiRuntimeConditionExpression;
};
export type PhiTreeProviderBindingFieldDefinition = PhiTableProviderBindingFieldDefinition;
export type PhiTreeActionDefinition = PhiTableActionDefinition;
export type PhiTreeQueryValue = PhiTableQueryValue;

export type PhiTreeQuery = {
  search?: string;
};

export type PhiTreeProviderDragSourceCapability = {
  payloadType: `${string}/${string}`;
  sourceObjectIdentityPath: string;
};

export type PhiTreeProviderDropTargetCapability = {
  payloadType: `${string}/${string}`;
  modes?: readonly ("before" | "after" | "child" | "replace" | "append")[];
};

export type PhiTreeProviderResourceDescriptor = {
  resourceKey: string;
  title: string;
  description?: string;
  nodeIdentityPath: string;
  parentNodeIdentityPath: string;
  titleFieldKey: string;
  descriptionFieldKey?: string;
  iconFieldKey?: string;
  fields: readonly PhiTreeProviderFieldDefinition[];
  bindingFields?: readonly PhiTreeProviderBindingFieldDefinition[];
  query: { search?: boolean };
  actions?: readonly PhiTreeProviderActionCapability[];
  nodeOrdering?: "none" | "tree";
  dragSources?: readonly PhiTreeProviderDragSourceCapability[];
  dropTargets?: readonly PhiTreeProviderDropTargetCapability[];
};

export type PhiTreeProviderQueryRequest = {
  resourceKey: string;
  query: PhiTreeQuery;
  params?: Record<string, unknown>;
  signal: AbortSignal;
};

export type PhiTreeProviderQueryResult = {
  nodes: readonly Record<string, unknown>[];
};

export type PhiTreeProviderMutationResult = {
  status: "accepted" | "rejected";
  invalidation: "none" | "view" | "resource";
  canonicalValue?: unknown;
  nodePatch?: Record<string, unknown>;
  value?: Record<string, unknown> | null;
  errorCode?: string;
  message?: string;
};

type PhiTreeProviderMutationRequestBase = {
  resourceKey: string;
  params?: Record<string, unknown>;
  signal: AbortSignal;
};

export type PhiTreeProviderFieldMutationRequest = PhiTreeProviderMutationRequestBase & {
  kind: "field";
  nodeIdentity: PhiTreeNodeIdentity;
  fieldKey: string;
  originalValue: unknown;
  proposedValue: unknown;
  concurrencyToken?: string | number | null;
};

export type PhiTreeProviderActionMutationRequest = PhiTreeProviderMutationRequestBase & {
  kind: "action";
  actionKey: string;
  nodeIdentity?: PhiTreeNodeIdentity | null;
  selectedNodeIdentities?: readonly PhiTreeNodeIdentity[];
  actionValue?: PhiTreeQueryValue | Record<string, unknown>;
  query: PhiTreeQuery;
};

export type PhiTreeProviderNodeMoveMutationRequest = PhiTreeProviderMutationRequestBase & {
  kind: "node-move";
  movedNodeIdentity: PhiTreeNodeIdentity;
  targetParentNodeIdentity: PhiTreeNodeIdentity | null;
  beforeNodeIdentity: PhiTreeNodeIdentity | null;
  afterNodeIdentity: PhiTreeNodeIdentity | null;
  concurrencyToken?: string | number | null;
};

export type PhiTreeProviderDropMutationRequest = PhiTreeProviderMutationRequestBase & {
  kind: "drop";
  payloadType: `${string}/${string}`;
  sourceObjectIdentity: string;
  dropMode: "before" | "after" | "child" | "replace" | "append";
  targetParentNodeIdentity: PhiTreeNodeIdentity | null;
  beforeNodeIdentity: PhiTreeNodeIdentity | null;
  afterNodeIdentity: PhiTreeNodeIdentity | null;
};

export type PhiTreeProviderMutationRequest =
  | PhiTreeProviderFieldMutationRequest
  | PhiTreeProviderActionMutationRequest
  | PhiTreeProviderNodeMoveMutationRequest
  | PhiTreeProviderDropMutationRequest;

export type PhiTreeSourceBinding = {
  providerKey: PhiRuntimeDataProviderKey;
  resourceKey: string;
  params?: Record<string, unknown>;
};

export type PhiTreeBindingToolDefinition = {
  key: string;
  label?: string;
  placeholder?: string;
  control?: "select" | "autocomplete";
  width?: PhiCssLength;
};

export type PhiTreeWidgetPresentation = PhiControlPresentationConfig & {
  title?: string;
  description?: string;
  width?: PhiCssLength;
  minWidth?: PhiCssLength;
  maxWidth?: PhiCssLength;
  bordered?: boolean;
  blockNode?: boolean;
  showIcon?: boolean;
  showLine?: boolean;
  virtual?: boolean;
  row?: {
    striped?: boolean;
  };
  node: {
    titleFieldKey: string;
    descriptionFieldKey?: string;
    iconFieldKey?: string;
    titleEditor?: { enabled?: boolean; variant?: "outlined" | "borderless" | "filled" | "underlined" };
    iconEditor?: { enabled?: boolean };
  };
};

export type PhiTreeWidgetFeatures = {
  search?: { enabled?: boolean; placeholder?: string; debounceMs?: number };
  selection?: { mode?: "none" | "single" | "multiple" };
  checking?: { enabled?: boolean; strict?: boolean };
  expansion?: { defaultExpandAll?: boolean; defaultExpandedNodeIdentities?: readonly PhiTreeNodeIdentity[] };
  editing?: { enabled?: boolean };
  tools?: {
    mode?: "self-contained" | "external";
    bindingFields?: readonly PhiTreeBindingToolDefinition[];
    reset?: boolean;
    reload?: boolean;
  };
  actions?: {
    toolbar?: readonly PhiTreeActionDefinition[];
    node?: readonly PhiTreeActionDefinition[];
    selection?: readonly PhiTreeActionDefinition[];
  };
  dnd?: { mode?: "none" | "source" | "reorder" | "source-reorder"; payloadType?: `${string}/${string}` };
};

export type PhiTreeWidgetConfig = {
  presentation: PhiTreeWidgetPresentation;
  features: PhiTreeWidgetFeatures;
  initialQuery?: PhiTreeQuery;
  source: PhiTreeSourceBinding | null;
  signalRoutes?: PhiSignalRouteSet | null;
};

export class PhiTreeProviderError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PhiTreeProviderError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readPhiTreeProviderQueryResult(value: unknown): PhiTreeProviderQueryResult | null {
  if (!isRecord(value) || Object.keys(value).some((key) => key !== "nodes") ||
    !Array.isArray(value.nodes) || !value.nodes.every(isRecord)) {
    return null;
  }
  return { nodes: value.nodes };
}

export function readPhiTreeProviderMutationResult(value: unknown): PhiTreeProviderMutationResult | null {
  const allowedKeys = new Set([
    "status", "invalidation", "canonicalValue", "nodePatch", "value", "errorCode", "message",
  ]);
  if (!isRecord(value) || Object.keys(value).some((key) => !allowedKeys.has(key)) ||
    value.status !== "accepted" && value.status !== "rejected" ||
    value.invalidation !== "none" && value.invalidation !== "view" && value.invalidation !== "resource" ||
    value.nodePatch !== undefined && !isRecord(value.nodePatch) ||
    value.value !== undefined && value.value !== null && !isRecord(value.value) ||
    value.errorCode !== undefined && typeof value.errorCode !== "string" ||
    value.message !== undefined && typeof value.message !== "string" ||
    value.status === "rejected" && (typeof value.errorCode !== "string" || !value.errorCode.trim() ||
      value.canonicalValue !== undefined || value.nodePatch !== undefined || value.value !== undefined) ||
    value.status === "accepted" && value.errorCode !== undefined) {
    return null;
  }
  return value as PhiTreeProviderMutationResult;
}

export function readPhiTreeProviderError(error: unknown) {
  return error instanceof PhiTreeProviderError
    ? error
    : new PhiTreeProviderError("provider-error", error instanceof Error ? error.message : "Tree Provider failed.");
}

export function validatePhiTreeWidgetBinding(
  config: PhiTreeWidgetConfig,
  resource: PhiTreeProviderResourceDescriptor,
) {
  const errors: string[] = [];
  const fieldKeys = new Set(resource.fields.map((field) => field.key));
  for (const key of [
    config.presentation.node.titleFieldKey,
    config.presentation.node.descriptionFieldKey,
    config.presentation.node.iconFieldKey,
  ].filter((value): value is string => Boolean(value))) {
    if (!fieldKeys.has(key)) errors.push(`Tree presentation references undeclared field "${key}".`);
  }
  for (const tool of config.features.tools?.bindingFields ?? []) {
    if (!resource.bindingFields?.some((field) => field.key === tool.key)) {
      errors.push(`Tree binding tool references undeclared field "${tool.key}".`);
    }
  }
  if (config.features.search?.enabled && !resource.query.search) {
    errors.push("Tree search requires Provider query search capability.");
  }
  if (config.features.editing?.enabled) {
    for (const key of [
      config.presentation.node.titleEditor?.enabled ? config.presentation.node.titleFieldKey : null,
      config.presentation.node.iconEditor?.enabled ? config.presentation.node.iconFieldKey : null,
    ].filter((value): value is string => Boolean(value))) {
      if (!resource.fields.find((field) => field.key === key)?.mutable) {
        errors.push(`Tree editor requires mutable Provider field "${key}".`);
      }
    }
  }
  const providerActions = new Map(resource.actions?.map((action) => [action.key, action]) ?? []);
  for (const [scope, actions] of [
    ["resource", config.features.actions?.toolbar ?? []],
    ["node", config.features.actions?.node ?? []],
    ["selection", config.features.actions?.selection ?? []],
  ] as const) {
    for (const action of actions) {
      const capability = providerActions.get(action.key);
      if (action.execution === "provider" && !capability) {
        errors.push(`Tree action references undeclared Provider capability "${action.key}".`);
      } else if (action.execution === "provider" && capability?.scope !== scope) {
        errors.push(`Tree action "${action.key}" requires Provider scope "${scope}".`);
      } else if (action.execution === "provider" && capability?.confirmation === "required" && !action.confirm) {
        errors.push(`Tree action "${action.key}" requires confirmation presentation.`);
      }
    }
  }
  const dndMode = config.features.dnd?.mode ?? "none";
  if ((dndMode === "source" || dndMode === "source-reorder") && !resource.dragSources?.length) {
    errors.push("Tree source DnD requires a declared Provider drag source.");
  }
  if (config.features.dnd?.payloadType && !resource.dragSources?.some((source) =>
    source.payloadType === config.features.dnd?.payloadType)) {
    errors.push(`Tree DnD references undeclared payload type "${config.features.dnd.payloadType}".`);
  }
  if ((dndMode === "reorder" || dndMode === "source-reorder") && resource.nodeOrdering !== "tree") {
    errors.push("Tree reorder DnD requires Provider nodeOrdering \"tree\".");
  }
  return errors;
}
