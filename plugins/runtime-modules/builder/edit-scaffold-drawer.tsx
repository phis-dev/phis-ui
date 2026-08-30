"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

import { Button, theme as antdTheme } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { usePhiDeveloperBuilderStateValue } from "./developer-workspace-store";

export type PhiEditScaffoldDrawerProps = {
  kind: "layout";
  nodeId: PhiCmsInstanceId;
  regionKey: string;
  title?: ReactNode;
  scaffoldLabel?: string | null;
  packageName?: ReactNode;
  className?: string;
  onOpenInsert?: () => void;
  onClick?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  children?: ReactNode;
  chrome?: ReactNode;
  style?: CSSProperties;
};

export function PhiEditScaffoldDrawer({
  kind,
  nodeId,
  regionKey,
  scaffoldLabel,
  className,
  onOpenInsert,
  onClick,
  onKeyDown,
  children,
  chrome,
  style,
}: PhiEditScaffoldDrawerProps) {
  const { token } = antdTheme.useToken();
  const selected = usePhiDeveloperBuilderStateValue(
    "public",
    (state) =>
      state.selectedRootRegionKey === regionKey &&
      state.nodeId === nodeId &&
      (state.nodeKind === "layout"),
  );
  const isEmpty = children == null;
  const scaffoldVars = {
    "--phi-edit-scaffold-background": "var(--phi-debug-layer-scaffold-background)",
    "--phi-edit-scaffold-border": "var(--phi-debug-layer-scaffold-border)",
    "--phi-edit-scaffold-background-selected": "var(--phi-debug-layer-scaffold-background-strong)",
    "--phi-edit-scaffold-border-selected": "var(--phi-debug-layer-scaffold-border-strong)",
    "--phi-edit-scaffold-hover-background": `color-mix(in srgb, ${token.colorSuccessBg} 50%, transparent)`,
    "--phi-edit-scaffold-selected-background": `color-mix(in srgb, ${token.colorSuccessBg} 65%, transparent)`,
    "--phi-edit-scaffold-kind-border": token.colorSuccessBorder,
    "--phi-edit-scaffold-label-background": token.colorSuccessBg,
    "--phi-edit-scaffold-label-border": token.colorSuccessBorder,
    "--phi-edit-scaffold-label-color": token.colorSuccessText,
  } as CSSProperties & Record<`--${string}`, string>;

  return (
    <div
      className={["phi-edit-scaffold-drawer", className].filter(Boolean).join(" ")}
      data-phi-edit-scaffold-kind={kind}
      data-phi-edit-scaffold-selected={selected ? "true" : undefined}
      data-phi-edit-scaffold-empty={isEmpty ? "true" : undefined}
      data-phi-builder-layout-title={scaffoldLabel?.trim() || undefined}
      role="button"
      tabIndex={0}
      style={{
        ...scaffoldVars,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        if (onKeyDown) {
          onKeyDown(event);
          return;
        }

        onClick?.();
      }}
    >
      <div
        className="phi-edit-scaffold-drawer__body"
        style={{
          ...({
            "--phi-edit-scaffold-body-justify": isEmpty ? "center" : "flex-start",
            "--phi-edit-scaffold-body-align": isEmpty ? "center" : "stretch",
          } as CSSProperties & Record<`--${string}`, string>),
        }}
      >
        {children ?? (
          <div
            style={{
              display: "inline-flex",
              padding: 0,
              border: `1px solid ${token.colorError}`,
              boxShadow: `inset 0 0 0 1px ${token.colorError}`,
              borderRadius: 0,
            }}
          >
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              aria-label="Insert child"
              onClick={(event) => {
                event.stopPropagation();
                onOpenInsert?.();
              }}
            />
          </div>
        )}
      </div>
      {chrome}
    </div>
  );
}
