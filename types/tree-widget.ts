import type { PhiControlPresentationConfig } from "./control";
import type { PhiCssLength } from "./length";
import type { PhiRuntimeDataProviderKey } from "./runtime-data-provider";
import type {
  PhiProviderDropMode,
  PhiProviderDropTargetCapability,
  PhiSignalRouteSet,
} from "./signals";
import type {
  PhiTableActionDefinition,
  PhiTableProviderBindingFieldDefinition,
  PhiTableProviderFieldDefinition,
  PhiTableQueryValue,
} from "./table-widget";
import type { PhiRuntimeConditionExpression } from "./runtime-condition";
import { isPhiRecord } from "../helpers/is-record";

export type PhiTreeNodeIdentity = string | number;
export type PhiTreeProviderFieldDefinition = PhiTableProviderFieldDefinition;
export type PhiTreeProviderActionCapability = {
  key: string;
  title: string;
  scope: "resource" | "node" | "selection";
  valueType?: "none" | "boolean" | "string" | "number" | "string[]" | "number[]" | "json";
  intent?: "read" | "write" | "destructive";
  confirmation?: "none" | "required";
  /**
   * The Provider's promise that the mutation can be taken back through the workspace history. It is
   * what lets a destructive action go without confirmation; like `confirmation`, it is declared, not
   * verified.
   */
  undoable?: boolean;
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

export type PhiTreeProviderDropTargetCapability = PhiProviderDropTargetCapability;

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
  /**
   * The reader's language and the Site's time zone (`usePhiIntlLocale`, `usePhiIntlTimeZone`), filled by
   * the binding, for a Provider that writes words, amounts or dates into what it answers. Part of the
   * binding's load key: a live language switch asks again.
   */
  locale: string;
  timeZone: string;
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
  dropMode: PhiProviderDropMode;
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

/**
 * A node's field by dotted path, as the Tree reads identities, parents and titles.
 *
 * Deliberately not `readPhiDotPath`: a Tree walks into arrays (`"path.0"`) and keeps empty segments,
 * which the shared record reader does not. Both Tree copies read this way, and they read it here.
 */
export function readPhiTreeNodePath(node: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, node);
}

export function readPhiTreeProviderQueryResult(value: unknown): PhiTreeProviderQueryResult | null {
  if (!isPhiRecord(value) || Object.keys(value).some((key) => key !== "nodes") ||
    !Array.isArray(value.nodes) || !value.nodes.every(isPhiRecord)) {
    return null;
  }
  return { nodes: value.nodes };
}

export function readPhiTreeProviderMutationResult(value: unknown): PhiTreeProviderMutationResult | null {
  const allowedKeys = new Set([
    "status", "invalidation", "canonicalValue", "nodePatch", "value", "errorCode", "message",
  ]);
  if (!isPhiRecord(value) || Object.keys(value).some((key) => !allowedKeys.has(key)) ||
    value.status !== "accepted" && value.status !== "rejected" ||
    value.invalidation !== "none" && value.invalidation !== "view" && value.invalidation !== "resource" ||
    value.nodePatch !== undefined && !isPhiRecord(value.nodePatch) ||
    value.value !== undefined && value.value !== null && !isPhiRecord(value.value) ||
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
