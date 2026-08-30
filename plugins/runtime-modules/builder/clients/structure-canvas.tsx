"use client";

import { Flex, Typography, theme as antdTheme } from "antd";
import type { CSSProperties, ReactNode } from "react";

import { PhiCmsRegionType } from "../../../../constants/phi-cms";
import { PHI_LAYOUT } from "../../../../theme/phi-tokens";
import { resolvePhiCssLength } from "../../../../helpers/css-length";
import { usePhiDeveloperBuilderStateValue } from "../developer-workspace-store";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderRegionDraft,
} from "../developer-workspace-types";
import type { PhiBuilderPageDraftsMapByScope } from "../page-presets.server";
import type { PhiShellRegionTheme } from "../../../../helpers/shell-region-style";
import {
  getPhiBuilderRegionDraftKey,
  isPhiBuilderPageScopedRegion,
} from "../region-keys";
import type { PhiStructureRegionPickItem } from "../widgets/structure-region/config";
import { PhiStructureDndProvider } from "../structure-dnd";
import {
  PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS,
  type PhiBuilderChromeWidgetLabels,
} from "../../../../components/widgets/label-types/builder-chrome";
import {
  PHI_REGION_WIDGET_DEFAULT_LABELS,
  type PhiRegionWidgetLabels,
} from "../../../../components/widgets/label-types/region";
import { PhiStructureRegionScaffold } from "../widgets/structure-region/built-in";

type PhiBuilderCanvasPickerLabels = PhiBuilderChromeWidgetLabels["canvas"]["picker"];

export type PhiDeveloperBuilderCanvasRegionKey =
  | "header_top"
  | "header_main"
  | "header_bottom"
  | "hero"
  | "sider_left"
  | "sider_right"
  | "content"
  | "footer_top"
  | "footer_main"
  | "footer_bottom";

export type PhiDeveloperBuilderStructureCanvasProps = {
  workspace?: "structure" | "pages";
  builderMode: "editor" | "preview";
  area: string;
  pageKey: string;
  shellTheme?: PhiShellRegionTheme;
  regionDrafts: Record<string, PhiDeveloperBuilderRegionDraft>;
  pageDraftsByScope?: PhiBuilderPageDraftsMapByScope;
  serverPreviewRegions?: Partial<Record<PhiDeveloperBuilderCanvasRegionKey, ReactNode>>;
  pickItems: readonly PhiStructureRegionPickItem[];
  regionLabels?: PhiRegionWidgetLabels;
  pickerLabels?: PhiBuilderCanvasPickerLabels;
};

type PhiDeveloperBuilderRegionSpec = {
  kind: "region";
  regionKey: PhiDeveloperBuilderCanvasRegionKey;
  title: keyof PhiRegionWidgetLabels["regions"];
  regionType: number;
  subtitle?: "siderFullHeight" | "selectedPageHeaderBand" | "pageSidebar";
};

type PhiDeveloperBuilderColumnSpec = {
  kind: "column";
  key: string;
  gap?: string;
  children: PhiDeveloperBuilderWorkspaceNode[];
};

type PhiDeveloperBuilderSplitSpec = {
  kind: "split";
  key: string;
  columnsTemplate?: string;
  gap?: string;
  children: PhiDeveloperBuilderWorkspaceNode[];
};

type PhiDeveloperBuilderViewportSpec = {
  kind: "viewport";
  key: string;
  bodyMinHeight?: string;
  children?: PhiDeveloperBuilderWorkspaceNode[];
};

type PhiDeveloperBuilderWorkspaceNode =
  | PhiDeveloperBuilderRegionSpec
  | PhiDeveloperBuilderColumnSpec
  | PhiDeveloperBuilderSplitSpec
  | PhiDeveloperBuilderViewportSpec;

function withCssVars<T extends CSSProperties>(
  style: T,
  vars: Record<`--${string}`, string>,
): T & Record<`--${string}`, string> {
  return {
    ...style,
    ...vars,
  };
}

const PHI_STRUCTURE_WORKSPACE_SPEC: PhiDeveloperBuilderWorkspaceNode[] = [
  {
    kind: "region",
    regionKey: "header_top",
    title: "headerTop",
    regionType: PhiCmsRegionType.HeaderTop,
  },
  {
    kind: "region",
    regionKey: "header_main",
    title: "headerMain",
    regionType: PhiCmsRegionType.HeaderMain,
  },
  {
    kind: "split",
    key: "structure-body",
    gap: "0px",
    children: [
      {
        kind: "region",
        regionKey: "sider_left",
        title: "siderLeft",
        regionType: PhiCmsRegionType.SiderLeft,
        subtitle: "siderFullHeight",
      },
      {
        kind: "column",
        key: "structure-content-column",
        gap: "0px",
        children: [
          {
            kind: "viewport",
            key: "page-content-viewport",
            bodyMinHeight: "280px",
          },
        ],
      },
    ],
  },
  {
    kind: "region",
    regionKey: "footer_main",
    title: "footerMain",
    regionType: PhiCmsRegionType.Footer,
  },
  {
    kind: "region",
    regionKey: "footer_bottom",
    title: "footerBottom",
    regionType: PhiCmsRegionType.FooterBottom,
  },
];

const PHI_PAGES_WORKSPACE_SPEC: PhiDeveloperBuilderWorkspaceNode[] = [
  {
    kind: "region",
    regionKey: "header_bottom",
    title: "headerBottom",
    regionType: PhiCmsRegionType.HeaderBottom,
    subtitle: "selectedPageHeaderBand",
  },
  {
    kind: "split",
    key: "pages-body",
    gap: "0px",
    children: [
      {
        kind: "column",
        key: "pages-main-column",
        gap: "0px",
        children: [
          {
            kind: "region",
            regionKey: "hero",
            title: "hero",
            regionType: PhiCmsRegionType.Hero,
          },
          {
            kind: "region",
            regionKey: "content",
            title: "content",
            regionType: PhiCmsRegionType.Content,
          },
        ],
      },
      {
        kind: "region",
        regionKey: "sider_right",
        title: "siderRight",
        regionType: PhiCmsRegionType.SiderRight,
        subtitle: "pageSidebar",
      },
    ],
  },
  {
    kind: "region",
    regionKey: "footer_top",
    title: "footerTop",
    regionType: PhiCmsRegionType.FooterTop,
  },
];

export function PhiDeveloperBuilderStructureCanvas({
  workspace = "structure",
  builderMode,
  area,
  pageKey,
  regionDrafts,
  pageDraftsByScope,
  serverPreviewRegions,
  pickItems,
  regionLabels = PHI_REGION_WIDGET_DEFAULT_LABELS,
  pickerLabels = PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.canvas.picker,
}: PhiDeveloperBuilderStructureCanvasProps) {
  const { token } = antdTheme.useToken();
  const debugScaffold = usePhiDeveloperBuilderStateValue("public", (state) => state.debugScaffold);
  const isPreviewMode = builderMode === "preview";
  const isPagesWorkspace = workspace === "pages";
  const workspaceSpec = isPagesWorkspace ? PHI_PAGES_WORKSPACE_SPEC : PHI_STRUCTURE_WORKSPACE_SPEC;
  const slotKind = isPagesWorkspace ? "content" : "structure";

  const resolveWorkspaceDraft = (regionKey: PhiDeveloperBuilderCanvasRegionKey) => {
    return regionDrafts[getPhiBuilderRegionDraftKey(
      area,
      regionKey,
      isPhiBuilderPageScopedRegion(regionKey) ? pageKey : null,
    )] ?? null;
  };

  const renderRegion = (node: PhiDeveloperBuilderRegionSpec) => {
    const regionLabel = regionLabels.regions[node.title];
    const currentDraft = resolveWorkspaceDraft(node.regionKey);
    const structureDraftsByArea =
      !isPagesWorkspace && currentDraft != null
        ? ({
            [area as PhiDeveloperBuilderArea]: currentDraft,
          } as Partial<Record<PhiDeveloperBuilderArea, PhiDeveloperBuilderRegionDraft | null>>)
        : undefined;
    const pageDraft =
      isPagesWorkspace
        ? pageDraftsByScope?.[area as PhiDeveloperBuilderArea]?.[pageKey]?.[`${area}:${pageKey}:${node.regionKey}`] ?? null
        : null;
    const resolvedPageDraftsByScope =
      isPagesWorkspace && pageDraft != null
        ? ({
            [area]: {
              [pageKey]: pageDraft,
            },
          } as Partial<Record<PhiDeveloperBuilderArea, Partial<Record<string, PhiDeveloperBuilderRegionDraft | null>>>>)
        : undefined;

    return (
      <PhiStructureRegionScaffold
        key={node.regionKey}
        config={{
          slotKind,
          regionKey: node.regionKey,
          title: regionLabel.title,
          subtitle: node.subtitle ? regionLabels.structure.surface[node.subtitle] : null,
          allowSelect: true,
          allowInsert: true,
          pickItems: [...pickItems],
          fallbackMinHeight:
            isPagesWorkspace && (node.regionKey === "hero" || node.regionKey === "content") ? 180 : undefined,
        }}
        structureDraftsByArea={structureDraftsByArea}
        pageDraftsByScope={resolvedPageDraftsByScope}
        serverPreview={serverPreviewRegions?.[node.regionKey] ?? null}
        pickerLabels={pickerLabels}
        containerClassName="phi-builder-workspace-region-scaffold"
      />
    );
  };

  const renderWorkspaceNode = (node: PhiDeveloperBuilderWorkspaceNode): ReactNode => {
    switch (node.kind) {
      case "region":
        return renderRegion(node);
      case "column": {
        const renderedChildren = node.children.map(renderWorkspaceNode).filter((child) => child != null);
        if (renderedChildren.length === 0) {
          return null;
        }

        if (renderedChildren.length === 1) {
          return renderedChildren[0];
        }

        return (
          <div
            key={node.key}
            className="phi-builder-structure-canvas__content-column"
            style={withCssVars({
              flex: "1 1 auto",
              minWidth: 0,
            }, { "--phi-builder-section-gap": node.gap ?? "0px" })}
          >
            {renderedChildren}
          </div>
        );
      }
      case "split": {
        const renderedChildren = node.children.map(renderWorkspaceNode).filter((child) => child != null);
        if (renderedChildren.length === 0) {
          return null;
        }

        if (renderedChildren.length === 1) {
          return renderedChildren[0];
        }

        const resolvedColumnsTemplate = (() => {
          const firstChild = node.children[0];
          const secondChild = node.children[1];

          if (firstChild?.kind === "region" && firstChild.regionKey === "sider_left") {
            const draft = resolveWorkspaceDraft("sider_left");
            const width = resolvePhiCssLength(draft?.size?.width ?? draft?.minSize?.width ?? PHI_LAYOUT.sidebarWidth) ?? `${PHI_LAYOUT.sidebarWidth}px`;
            return `${width} minmax(0, 1fr)`;
          }

          if (secondChild?.kind === "region" && secondChild.regionKey === "sider_right") {
            const draft = resolveWorkspaceDraft("sider_right");
            const width = resolvePhiCssLength(draft?.size?.width ?? draft?.minSize?.width ?? PHI_LAYOUT.sidebarWidth) ?? `${PHI_LAYOUT.sidebarWidth}px`;
            return `minmax(0, 1fr) ${width}`;
          }

          return node.columnsTemplate;
        })();

        return (
          <div
            key={node.key}
            className="phi-builder-structure-canvas__split"
            style={withCssVars({
              flex: "1 1 auto",
              alignItems: "stretch",
              ...(resolvedColumnsTemplate ? { gridTemplateColumns: resolvedColumnsTemplate } : {}),
            }, { "--phi-builder-split-gap": node.gap ?? "0px" })}
          >
            {renderedChildren}
          </div>
        );
      }
      case "viewport":
        return (
          <div
            key={node.key}
            className="phi-builder-structure-canvas__content-slot phi-builder-structure-region__slot"
            data-phi-region-slot={node.key}
            style={withCssVars({
              border:
                builderMode === "preview"
                  ? `1px solid ${token.colorBorderSecondary}`
                  : `1px dashed ${token.colorBorderSecondary}`,
              borderRadius: 0,
              backgroundColor: builderMode === "preview" ? token.colorFillQuaternary : token.colorFillTertiary,
              width: "100%",
              alignSelf: "stretch",
            }, {
              "--phi-builder-content-body-min-height": node.bodyMinHeight ?? "280px",
              "--phi-builder-content-body-max-height": "none",
              "--phi-builder-content-body-padding": "0px",
              "--phi-builder-content-body-gap": "0px",
              "--phi-builder-empty-insert-color": token.colorTextSecondary,
            })}
          >
            <div className="phi-builder-structure-canvas__content-body">
              {isPreviewMode ? null : node.children && node.children.length > 0 ? (
                node.children.map(renderWorkspaceNode)
              ) : (
                <Flex
                  vertical
                  align="center"
                  justify="center"
                  gap={6}
                  style={{ minHeight: "var(--phi-builder-content-body-min-height)", padding: 24, textAlign: "center" }}
                >
                  <Typography.Text strong>{regionLabels.structure.surface.contentTitle}</Typography.Text>
                  <Typography.Text type="secondary">
                    {regionLabels.structure.surface.contentDescription}
                  </Typography.Text>
                </Flex>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <PhiStructureDndProvider>
      <div
      className="phi-builder-structure-canvas"
      data-phi-debug-scaffold={debugScaffold ? "on" : undefined}
      style={withCssVars({
        paddingTop: 0,
        border: "none",
        borderRadius: 0,
        boxShadow: "none",
        height: "100%",
        minHeight: 0,
      }, {
        "--phi-builder-structure-canvas-body-padding": isPagesWorkspace ? "0px" : "var(--ant-padding-xs)",
        "--phi-builder-structure-canvas-outer-gap": "0px",
      })}
    >
      <Flex
        vertical
        className="phi-builder-structure-canvas__stack"
        style={{
          height: "100%",
          flex: "1 1 auto",
          padding: isPagesWorkspace ? 0 : "var(--ant-padding-xs)",
          borderRadius: 0,
          background: token.colorFillSecondary,
          border: "none",
        }}
      >
        <div
          className={[
            "phi-builder-structure-canvas__sections",
            isPreviewMode ? "phi-builder-structure-canvas__sections--preview" : null,
          ]
            .filter(Boolean)
            .join(" ")}
          style={withCssVars(
            { flex: "1 1 auto" },
            { "--phi-builder-section-gap": "0px" },
          )}
        >
          {workspaceSpec.map(renderWorkspaceNode)}
        </div>
      </Flex>
      </div>
    </PhiStructureDndProvider>
  );
}
