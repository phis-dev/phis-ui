"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  PhiTreeNodeIdentity,
  PhiTreeProviderMutationRequest,
  PhiTreeProviderMutationResult,
  PhiTreeQuery,
  PhiTreeQueryValue,
  PhiTreeSourceBinding,
} from "../../../types/tree-widget";
import {
  PhiTreeProviderError,
  readPhiTreeProviderError,
  readPhiTreeProviderMutationResult,
  readPhiTreeProviderQueryResult,
} from "../../../types/tree-widget";
import { validatePhiTableProviderFieldValue } from "../../../types/table-widget";
import { usePhiTreeProvider } from "../../widgets/client/shared/phi-tree-provider";

type TreeNode = Record<string, unknown>;
type MutationInput = PhiTreeProviderMutationRequest extends infer TRequest
  ? TRequest extends PhiTreeProviderMutationRequest
    ? Omit<TRequest, "resourceKey" | "params" | "signal">
    : never
  : never;

function readPath(value: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}

function patchNode(
  nodes: readonly TreeNode[],
  identityPath: string,
  identity: PhiTreeNodeIdentity,
  patch: Record<string, unknown>,
) {
  return nodes.map((node) => String(readPath(node, identityPath)) === String(identity) ? { ...node, ...patch } : node);
}

function moveNodeOptimistically(
  nodes: readonly TreeNode[],
  identityPath: string,
  parentPath: string,
  request: {
    movedNodeIdentity: PhiTreeNodeIdentity;
    targetParentNodeIdentity: PhiTreeNodeIdentity | null;
    beforeNodeIdentity: PhiTreeNodeIdentity | null;
    afterNodeIdentity: PhiTreeNodeIdentity | null;
  },
) {
  const movedIndex = nodes.findIndex((node) => String(readPath(node, identityPath)) === String(request.movedNodeIdentity));
  if (movedIndex < 0) return nodes;
  const moved = { ...nodes[movedIndex], [parentPath]: request.targetParentNodeIdentity };
  const remaining = nodes.filter((_, index) => index !== movedIndex);
  let insertIndex = request.beforeNodeIdentity == null ? -1 : remaining.findIndex((node) =>
    String(readPath(node, identityPath)) === String(request.beforeNodeIdentity));
  if (insertIndex < 0 && request.afterNodeIdentity != null) {
    const afterIndex = remaining.findIndex((node) =>
      String(readPath(node, identityPath)) === String(request.afterNodeIdentity));
    insertIndex = afterIndex < 0 ? -1 : afterIndex + 1;
  }
  if (insertIndex < 0) {
    const siblingIndexes = remaining.flatMap((node, index) =>
      String(readPath(node, parentPath)) === String(request.targetParentNodeIdentity) ? [index] : []);
    insertIndex = siblingIndexes.length ? siblingIndexes.at(-1)! + 1 : remaining.length;
  }
  return [...remaining.slice(0, insertIndex), moved, ...remaining.slice(insertIndex)];
}

function validateTree(nodes: readonly TreeNode[], identityPath: string, parentPath: string) {
  const identities = new Set<string>();
  for (const node of nodes) {
    const identity = readPath(node, identityPath);
    if (typeof identity !== "string" && typeof identity !== "number") return `Tree node is missing identity field "${identityPath}".`;
    if (identities.has(String(identity))) return `Tree Provider returned duplicate node identity "${String(identity)}".`;
    identities.add(String(identity));
  }
  for (const node of nodes) {
    const parent = readPath(node, parentPath);
    if (parent != null && !identities.has(String(parent))) return `Tree node references unknown parent "${String(parent)}".`;
    const seen = new Set<string>();
    let current: unknown = readPath(node, identityPath);
    while (current != null) {
      const key = String(current);
      if (seen.has(key)) return `Tree Provider returned a hierarchy cycle at "${key}".`;
      seen.add(key);
      const currentNode = nodes.find((candidate) => String(readPath(candidate, identityPath)) === key);
      current = currentNode ? readPath(currentNode, parentPath) : null;
    }
  }
  return null;
}

export function usePhiTreeBinding({
  source,
  initialQuery = {},
  defaultExpandedNodeIdentities = [],
  defaultExpandAll = false,
}: {
  source: PhiTreeSourceBinding | null;
  initialQuery?: PhiTreeQuery;
  defaultExpandedNodeIdentities?: readonly PhiTreeNodeIdentity[];
  defaultExpandAll?: boolean;
}) {
  const { provider, resource, bindingError } = usePhiTreeProvider(source);
  const [query, setQuery] = useState(initialQuery);
  const [nodes, setNodes] = useState<readonly TreeNode[]>([]);
  const nodesRef = useRef(nodes);
  const [loading, setLoading] = useState(Boolean(source));
  const [error, setError] = useState<PhiTreeProviderError | null>(null);
  const [selectedNodeIdentities, setSelectedNodeIdentities] = useState<readonly PhiTreeNodeIdentity[]>([]);
  const [checkedNodeIdentities, setCheckedNodeIdentities] = useState<readonly PhiTreeNodeIdentity[]>([]);
  const [expandedNodeIdentities, setExpandedNodeIdentities] = useState<readonly PhiTreeNodeIdentity[]>(defaultExpandedNodeIdentities);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const expandedInitialSnapshot = useRef(false);
  const sourceKey = useMemo(() => JSON.stringify(source), [source]);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => {
    expandedInitialSnapshot.current = false;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setNodes([]);
      setSelectedNodeIdentities([]);
      setCheckedNodeIdentities([]);
      setExpandedNodeIdentities(defaultExpandedNodeIdentities);
      setQuery(initialQuery);
    });
    return () => { cancelled = true; };
  }, [defaultExpandedNodeIdentities, initialQuery, sourceKey]);

  useEffect(() => {
    if (!source || !provider || !resource) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setError(null);
      }
    });
    void provider.query({ resourceKey: source.resourceKey, query, params: source.params, signal: controller.signal })
      .then((value) => {
        if (controller.signal.aborted) return;
        const result = readPhiTreeProviderQueryResult(value);
        if (!result) throw new PhiTreeProviderError("invalid-query-result", "Tree Provider returned an invalid query result.");
        const validationError = validateTree(result.nodes, resource.nodeIdentityPath, resource.parentNodeIdentityPath);
        if (validationError) throw new PhiTreeProviderError("invalid-tree", validationError);
        nodesRef.current = result.nodes;
        setNodes(result.nodes);
        if (defaultExpandAll && !expandedInitialSnapshot.current) {
          expandedInitialSnapshot.current = true;
          setExpandedNodeIdentities(result.nodes.flatMap((node) => {
            const identity = readPath(node, resource.nodeIdentityPath);
            return identity == null ? [] : [identity as PhiTreeNodeIdentity];
          }));
        }
        setLoading(false);
      })
      .catch((queryError: unknown) => {
        if (!controller.signal.aborted) {
          setNodes([]);
          setLoading(false);
          setError(readPhiTreeProviderError(queryError));
        }
      });
    return () => controller.abort();
  }, [defaultExpandAll, provider, query, refreshRevision, resource, source]);

  const mutate = useCallback(async (request: MutationInput, optimisticNodes?: readonly TreeNode[]) => {
    if (bindingError || !provider || !resource || !source) {
      throw new PhiTreeProviderError("provider-unavailable", bindingError ?? "Tree Provider is unavailable.");
    }
    if (!provider.mutate) throw new PhiTreeProviderError("provider-read-only", `Tree Provider "${source.providerKey}" is read-only.`);
    const previous = nodesRef.current;
    if (optimisticNodes) {
      nodesRef.current = optimisticNodes;
      setNodes(optimisticNodes);
    }
    try {
      const rawResult = await provider.mutate({ ...request, resourceKey: source.resourceKey, params: source.params, signal: new AbortController().signal } as PhiTreeProviderMutationRequest);
      const result = readPhiTreeProviderMutationResult(rawResult);
      if (!result) throw new PhiTreeProviderError("invalid-mutation-result", "Tree Provider returned an invalid mutation result.");
      if (result.status === "rejected") {
        nodesRef.current = previous;
        setNodes(previous);
        setError(new PhiTreeProviderError(result.errorCode ?? "mutation-rejected", result.message ?? "Tree change was rejected."));
      } else if (request.kind === "field") {
        const canonicalValue = result.canonicalValue === undefined ? request.proposedValue : result.canonicalValue;
        const next = patchNode(nodesRef.current, resource.nodeIdentityPath, request.nodeIdentity, {
          [request.fieldKey]: canonicalValue,
          ...(result.nodePatch ?? {}),
        });
        nodesRef.current = next;
        setNodes(next);
      }
      if (result.invalidation !== "none") setRefreshRevision((current) => current + 1);
      return result as PhiTreeProviderMutationResult;
    } catch (mutationError) {
      nodesRef.current = previous;
      setNodes(previous);
      const nextError = readPhiTreeProviderError(mutationError);
      setError(nextError);
      throw nextError;
    }
  }, [bindingError, provider, resource, source]);

  const commitField = useCallback(async (nodeIdentity: PhiTreeNodeIdentity, fieldKey: string, proposedValue: unknown) => {
    if (!resource) throw new PhiTreeProviderError("resource-unavailable", "Tree resource is unavailable.");
    const field = resource.fields.find((candidate) => candidate.key === fieldKey);
    if (!field?.mutable) throw new PhiTreeProviderError("field-read-only", `Tree field "${fieldKey}" is read-only.`);
    const validationError = validatePhiTableProviderFieldValue(field, proposedValue);
    if (validationError) throw new PhiTreeProviderError("invalid-field-value", validationError.replaceAll("Table field", "Tree field"));
    const node = nodesRef.current.find((candidate) => String(readPath(candidate, resource.nodeIdentityPath)) === String(nodeIdentity));
    const originalValue = node ? readPath(node, fieldKey) : undefined;
    return mutate({ kind: "field", nodeIdentity, fieldKey, originalValue, proposedValue }, patchNode(nodesRef.current, resource.nodeIdentityPath, nodeIdentity, { [fieldKey]: proposedValue }));
  }, [mutate, resource]);

  const executeAction = useCallback((actionKey: string, nodeIdentity?: PhiTreeNodeIdentity | null, actionValue?: PhiTreeQueryValue | Record<string, unknown>) =>
    mutate({ kind: "action", actionKey, nodeIdentity, selectedNodeIdentities, actionValue, query }),
  [mutate, query, selectedNodeIdentities]);

  const moveNode = useCallback((request: Omit<Extract<MutationInput, { kind: "node-move" }>, "kind">) => {
    if (!resource) throw new PhiTreeProviderError("resource-unavailable", "Tree resource is unavailable.");
    let ancestor = request.targetParentNodeIdentity;
    while (ancestor != null) {
      if (String(ancestor) === String(request.movedNodeIdentity)) {
        throw new PhiTreeProviderError("invalid-node-move", "A Tree node cannot be moved into itself or one of its descendants.");
      }
      const ancestorNode = nodesRef.current.find((node) =>
        String(readPath(node, resource.nodeIdentityPath)) === String(ancestor));
      ancestor = ancestorNode ? readPath(ancestorNode, resource.parentNodeIdentityPath) as PhiTreeNodeIdentity | null : null;
    }
    const optimistic = moveNodeOptimistically(
      nodesRef.current,
      resource.nodeIdentityPath,
      resource.parentNodeIdentityPath,
      request,
    );
    return mutate({ kind: "node-move", ...request }, optimistic);
  }, [mutate, resource]);

  const drop = useCallback((request: Omit<Extract<MutationInput, { kind: "drop" }>, "kind">) =>
    mutate({ kind: "drop", ...request }), [mutate]);

  return {
    provider, resource, bindingError,
    query, setQuery,
    nodes, loading, error,
    selectedNodeIdentities, setSelectedNodeIdentities,
    checkedNodeIdentities, setCheckedNodeIdentities,
    expandedNodeIdentities, setExpandedNodeIdentities,
    reload: () => setRefreshRevision((current) => current + 1),
    commitField, executeAction, moveNode, drop,
  };
}
