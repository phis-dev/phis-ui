"use client";

import { HolderOutlined } from "@ant-design/icons";
import { Button, Flex, Skeleton, Tree, Typography, theme as antdTheme } from "antd";
import type { DataNode, EventDataNode } from "antd/es/tree";
import { useMemo, useState, type CSSProperties, type DragEvent as ReactDragEvent } from "react";

import type {
  PhiTreeActionDefinition,
  PhiTreeNodeIdentity,
  PhiTreeWidgetPresentation,
} from "../../types/tree-widget";
import type { PhiControlSize } from "../../types/control";
import { PhiIcon } from "../shell/phi-icon";
import { PhiIconPickerControl } from "./phi-icon-picker-control";
import { PhiTextControl } from "./phi-text-control";
import { PhiConfirmControl } from "./phi-confirm-control";
import { PhiExpandIndicator } from "./phi-expand-indicator";
import { PhiLink } from "../navigation/phi-link";
import styles from "./phi-tree-control.module.css";

type TreeRecord = Record<string, unknown>;
type PhiTreeControlNode = DataNode & {
  key: string | number;
  record: TreeRecord;
  identity: PhiTreeNodeIdentity;
  parentIdentity: PhiTreeNodeIdentity | null;
};

export type PhiTreeControlDropRequest = {
  movedNodeIdentity: PhiTreeNodeIdentity;
  targetParentNodeIdentity: PhiTreeNodeIdentity | null;
  beforeNodeIdentity: PhiTreeNodeIdentity | null;
  afterNodeIdentity: PhiTreeNodeIdentity | null;
};

export type PhiTreeControlExternalDropRequest = Omit<PhiTreeControlDropRequest, "movedNodeIdentity"> & {
  dropMode: "before" | "after" | "child";
  event: ReactDragEvent<HTMLElement>;
};

function readPath(value: TreeRecord, path: string | undefined): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((current, key) =>
    current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}

function readIdentity(value: unknown): PhiTreeNodeIdentity | null {
  return typeof value === "string" || typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildTreeData(
  nodes: readonly TreeRecord[],
  identityPath: string,
  parentPath: string,
): PhiTreeControlNode[] {
  const byParent = new Map<string, TreeRecord[]>();
  for (const node of nodes) {
    const parent = readIdentity(readPath(node, parentPath));
    const key = parent == null ? "__root__" : String(parent);
    byParent.set(key, [...(byParent.get(key) ?? []), node]);
  }
  const visit = (parent: PhiTreeNodeIdentity | null): PhiTreeControlNode[] =>
    (byParent.get(parent == null ? "__root__" : String(parent)) ?? []).flatMap((record) => {
      const identity = readIdentity(readPath(record, identityPath));
      if (identity == null) return [];
      const children = visit(identity);
      return [{
        key: identity,
        identity,
        parentIdentity: parent,
        record,
        title: String(identity),
        ...(children.length ? { children } : {}),
      }];
    });
  return visit(null);
}

function decorateVisibleTreeRows(
  nodes: readonly PhiTreeControlNode[],
  expandedNodeIdentities: ReadonlySet<string>,
  striped: boolean,
) {
  let visibleIndex = 0;
  const visit = (
    candidates: readonly PhiTreeControlNode[],
    visible: boolean,
  ): PhiTreeControlNode[] => candidates.map((node) => {
    const stripe = visible && striped && visibleIndex % 2 === 1;
    if (visible) visibleIndex += 1;
    const children = node.children
      ? visit(
          node.children as PhiTreeControlNode[],
          visible && expandedNodeIdentities.has(String(node.identity)),
        )
      : undefined;
    return {
      ...node,
      className: stripe ? styles.stripedRow : undefined,
      ...(children ? { children } : {}),
    };
  });
  return visit(nodes, true);
}

function PhiTreeNodeTitle({
  node,
  presentation,
  editing,
  actions,
  controlSize,
  onCommitField,
  onAction,
  onExternalDragOver,
  onExternalDrop,
}: {
  node: PhiTreeControlNode;
  presentation: PhiTreeWidgetPresentation;
  editing: boolean;
  actions: readonly PhiTreeActionDefinition[];
  controlSize: PhiControlSize;
  onCommitField?: (nodeIdentity: PhiTreeNodeIdentity, fieldKey: string, value: unknown) => Promise<unknown> | void;
  onAction?: (action: PhiTreeActionDefinition, nodeIdentity: PhiTreeNodeIdentity) => void;
  onExternalDragOver?: (request: PhiTreeControlExternalDropRequest) => boolean;
  onExternalDrop?: (request: PhiTreeControlExternalDropRequest) => void;
}) {
  const titleFieldKey = presentation.node.titleFieldKey;
  const descriptionFieldKey = presentation.node.descriptionFieldKey;
  const iconFieldKey = presentation.node.iconFieldKey;
  const title = String(readPath(node.record, titleFieldKey) ?? "");
  const description = readPath(node.record, descriptionFieldKey);
  const icon = readPath(node.record, iconFieldKey);
  const titleEditable = editing && presentation.node.titleEditor?.enabled && Boolean(onCommitField);
  const iconEditable = editing && presentation.node.iconEditor?.enabled && Boolean(iconFieldKey) && Boolean(onCommitField);
  const [draftTitle, setDraftTitle] = useState(title);

  const commitTitle = () => {
    if (draftTitle !== title) void onCommitField?.(node.identity, titleFieldKey, draftTitle);
  };

  return (
    <Flex
      align="center"
      gap="small"
      style={{ minWidth: 0, width: "100%" }}
      onDragOver={(event) => {
        if (!onExternalDragOver) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const ratio = bounds.height > 0 ? (event.clientY - bounds.top) / bounds.height : 0.5;
        const dropMode = ratio < 1 / 3 ? "before" : ratio > 2 / 3 ? "after" : "child";
        const accepted = onExternalDragOver({
          dropMode,
          event,
          targetParentNodeIdentity: dropMode === "child" ? node.identity : node.parentIdentity,
          beforeNodeIdentity: dropMode === "before" ? node.identity : null,
          afterNodeIdentity: dropMode === "after" ? node.identity : null,
        });
        if (accepted) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!onExternalDrop) return;
        event.preventDefault();
        event.stopPropagation();
        const bounds = event.currentTarget.getBoundingClientRect();
        const ratio = bounds.height > 0 ? (event.clientY - bounds.top) / bounds.height : 0.5;
        const dropMode = ratio < 1 / 3 ? "before" : ratio > 2 / 3 ? "after" : "child";
        onExternalDrop({
          dropMode,
          event,
          targetParentNodeIdentity: dropMode === "child" ? node.identity : node.parentIdentity,
          beforeNodeIdentity: dropMode === "before" ? node.identity : null,
          afterNodeIdentity: dropMode === "after" ? node.identity : null,
        });
      }}
    >
      {iconEditable ? (
        <PhiIconPickerControl
          value={typeof icon === "string" ? icon : null}
          buttonSize={controlSize}
          buttonType="text"
          onChange={(value) => void onCommitField?.(node.identity, iconFieldKey!, value)}
        />
      ) : presentation.showIcon !== false && typeof icon === "string" ? <PhiIcon name={icon} /> : null}
      <div style={{ display: "grid", flex: 1, minWidth: 0 }}>
        {titleEditable ? (
          <PhiTextControl
            value={draftTitle}
            size={controlSize}
            variant={presentation.node.titleEditor?.variant ?? "underlined"}
            onChange={(value) => setDraftTitle(value ?? "")}
            onPressEnter={commitTitle}
            onBlur={commitTitle}
          />
        ) : <span>{title}</span>}
        {description != null && description !== "" ? (
          <Typography.Text type="secondary" ellipsis>{String(description)}</Typography.Text>
        ) : null}
      </div>
      {actions.length ? (
        <Flex align="center" gap={2} onClick={(event) => event.stopPropagation()}>
          {actions.map((action) => (
            <PhiTreeActionButton
              key={action.key}
              action={action.execution === "link" && action.hrefPath
                ? { ...action, href: String(readPath(node.record, action.hrefPath) ?? "") }
                : action}
              size={controlSize}
              onActivate={() => onAction?.(action, node.identity)}
            />
          ))}
        </Flex>
      ) : null}
    </Flex>
  );
}

export function PhiTreeActionButton({
  action,
  size = "small",
  disabled = false,
  onActivate,
}: {
  action: PhiTreeActionDefinition;
  size?: PhiControlSize;
  disabled?: boolean;
  onActivate: () => void;
}) {
  const display = action.display ?? "label";
  const button = (
    <Button
      size={size}
      type={action.mode === "primary" ? "primary" : "default"}
      danger={action.mode === "danger"}
      disabled={disabled}
      icon={display !== "label" && action.icon ? <PhiIcon name={action.icon} /> : undefined}
      aria-label={action.label}
      onClick={() => { if (!action.confirm) onActivate(); }}
    >
      {display !== "icon" ? action.label : null}
    </Button>
  );
  const actionable = action.execution === "link" && action.href
    ? <PhiLink href={action.href} external={action.newTab} newTab={action.newTab}>{button}</PhiLink>
    : button;
  return action.confirm && action.execution !== "link" ? (
    <PhiConfirmControl
      title={action.confirm.title}
      description={action.confirm.description}
      confirmLabel={action.confirm.okText}
      cancelLabel={action.confirm.cancelText}
      danger={action.mode === "danger"}
      disabled={disabled}
      onConfirm={onActivate}
    >
      {actionable}
    </PhiConfirmControl>
  ) : actionable;
}

export function PhiTreeControl({
  nodes,
  nodeIdentityPath,
  parentNodeIdentityPath,
  presentation,
  loading = false,
  disabled = false,
  controlSize = "small",
  selectionMode = "single",
  selectedNodeIdentities,
  checkedNodeIdentities,
  checking = false,
  checkStrictly = false,
  expandedNodeIdentities,
  editing = false,
  nodeActions = [],
  draggable = false,
  onSelectionChange,
  onCheckingChange,
  onExpansionChange,
  onCommitField,
  onAction,
  onExternalDragOver,
  onExternalDrop,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  nodes: readonly TreeRecord[];
  nodeIdentityPath: string;
  parentNodeIdentityPath: string;
  presentation: PhiTreeWidgetPresentation;
  loading?: boolean;
  disabled?: boolean;
  controlSize?: PhiControlSize;
  selectionMode?: "none" | "single" | "multiple";
  selectedNodeIdentities: readonly PhiTreeNodeIdentity[];
  checkedNodeIdentities: readonly PhiTreeNodeIdentity[];
  checking?: boolean;
  checkStrictly?: boolean;
  expandedNodeIdentities: readonly PhiTreeNodeIdentity[];
  editing?: boolean;
  nodeActions?: readonly PhiTreeActionDefinition[];
  draggable?: boolean;
  onSelectionChange?: (identities: readonly PhiTreeNodeIdentity[]) => void;
  onCheckingChange?: (identities: readonly PhiTreeNodeIdentity[]) => void;
  onExpansionChange?: (identities: readonly PhiTreeNodeIdentity[]) => void;
  onCommitField?: (nodeIdentity: PhiTreeNodeIdentity, fieldKey: string, value: unknown) => Promise<unknown> | void;
  onAction?: (action: PhiTreeActionDefinition, nodeIdentity: PhiTreeNodeIdentity) => void;
  onExternalDragOver?: (request: PhiTreeControlExternalDropRequest) => boolean;
  onExternalDrop?: (request: PhiTreeControlExternalDropRequest) => void;
  onDragStart?: (nodeIdentity: PhiTreeNodeIdentity, event: ReactDragEvent<HTMLElement>) => void;
  onDragEnd?: (nodeIdentity: PhiTreeNodeIdentity, event: ReactDragEvent<HTMLElement>) => void;
  onDrop?: (request: PhiTreeControlDropRequest) => void;
}) {
  const { token } = antdTheme.useToken();
  const treeData = useMemo(() => buildTreeData(nodes, nodeIdentityPath, parentNodeIdentityPath), [nodes, nodeIdentityPath, parentNodeIdentityPath]);
  const expandedIdentitySet = useMemo(
    () => new Set(expandedNodeIdentities.map(String)),
    [expandedNodeIdentities],
  );
  const renderedTreeData = useMemo(
    () => decorateVisibleTreeRows(treeData, expandedIdentitySet, presentation.row?.striped === true),
    [expandedIdentitySet, presentation.row?.striped, treeData],
  );
  if (loading && nodes.length === 0) return <Skeleton active paragraph={{ rows: 6 }} title={false} />;

  const readEventNode = (value: EventDataNode<DataNode>) => value as unknown as PhiTreeControlNode;
  const tree = (
    <Tree<PhiTreeControlNode>
      className={styles.root}
      style={{
        width: "100%",
        background: presentation.bordered ? "transparent" : token.colorBgContainer,
        borderRadius: presentation.bordered ? 0 : undefined,
        "--phi-tree-striped-row-background": token.colorFillAlter,
      } as CSSProperties}
      blockNode={presentation.blockNode !== false}
      checkable={checking}
      checkStrictly={checkStrictly}
      checkedKeys={[...checkedNodeIdentities]}
      disabled={disabled}
      draggable={draggable ? { icon: <HolderOutlined />, nodeDraggable: () => true } : false}
      expandedKeys={[...expandedNodeIdentities]}
      multiple={selectionMode === "multiple"}
      selectable={selectionMode !== "none"}
      selectedKeys={[...selectedNodeIdentities]}
      showIcon={false}
      showLine={presentation.showLine}
      switcherIcon={(node) => node.isLeaf ? null : <PhiExpandIndicator expanded={Boolean(node.expanded)} />}
      virtual={presentation.virtual}
      allowDrop={() => Boolean(onDrop)}
      treeData={renderedTreeData}
      titleRender={(node) => (
        <PhiTreeNodeTitle
          key={`${String(node.identity)}:${String(readPath(node.record, presentation.node.titleFieldKey) ?? "")}`}
          node={node}
          presentation={presentation}
          editing={editing}
          actions={nodeActions}
          controlSize={controlSize}
          onCommitField={onCommitField}
          onAction={onAction}
          onExternalDragOver={onExternalDragOver}
          onExternalDrop={onExternalDrop}
        />
      )}
      onSelect={(keys) => onSelectionChange?.(keys as PhiTreeNodeIdentity[])}
      onCheck={(keys) => onCheckingChange?.((Array.isArray(keys) ? keys : keys.checked) as PhiTreeNodeIdentity[])}
      onExpand={(keys) => onExpansionChange?.(keys as PhiTreeNodeIdentity[])}
      onDragStart={(info) => onDragStart?.(readEventNode(info.node).identity, info.event)}
      onDragEnd={(info) => onDragEnd?.(readEventNode(info.node).identity, info.event)}
      onDrop={(info) => {
        if (!onDrop) return;
        const moved = readEventNode(info.dragNode);
        const target = readEventNode(info.node);
        const siblings = nodes.filter((node) =>
          String(readIdentity(readPath(node, parentNodeIdentityPath))) === String(target.parentIdentity));
        const targetIndex = siblings.findIndex((node) =>
          String(readIdentity(readPath(node, nodeIdentityPath))) === String(target.identity));
        const dropAsChild = !info.dropToGap;
        const insertAfter = info.dropPosition > Number(String(info.node.pos).split("-").at(-1));
        onDrop({
          movedNodeIdentity: moved.identity,
          targetParentNodeIdentity: dropAsChild ? target.identity : target.parentIdentity,
          beforeNodeIdentity: dropAsChild ? null : readIdentity(readPath(siblings[insertAfter ? targetIndex + 1 : targetIndex] ?? {}, nodeIdentityPath)),
          afterNodeIdentity: dropAsChild ? null : readIdentity(readPath(siblings[insertAfter ? targetIndex : targetIndex - 1] ?? {}, nodeIdentityPath)),
        });
      }}
    />
  );
  return presentation.bordered ? (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        overflow: "hidden",
        padding: token.paddingSM,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
      }}
    >
      {tree}
    </div>
  ) : tree;
}
