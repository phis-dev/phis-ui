"use client";

import { usePhiConfig } from "../../../../components/root/phi-config-provider";
import type { CSSProperties, ReactNode } from "react";

import { PhiCmsRegionType } from "../../../../constants/phi-cms";
import { resolvePhiBuilderSiderWidth } from "../builder-geometry";
import { usePhiDeveloperBuilderStateValue, usePhiDeveloperRegionDraft } from "../developer-workspace-store";
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
import { PhiFlexControl } from "../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../components/controls/phi-typography-control";

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

/**
 * One Region of the canvas, reading its own draft.
 *
 * The Canvas used to hand every Region the whole draft map, so a write to any draft re-rendered all of
 * them, each rebuilding its renderable tree and re-registering its demand Controllers. A Region that
 * subscribes to its own key renders when its draft changes and sits still otherwise.
 */
function PhiDeveloperBuilderCanvasRegion({
  node,
  area,
  pageKey,
  isPagesWorkspace,
  slotKind,
  pickItems,
  pageDraftsByScope,
  serverPreview,
  regionLabels,
  pickerLabels,
}: {
  node: PhiDeveloperBuilderRegionSpec;
  area: string;
  pageKey: string;
  isPagesWorkspace: boolean;
  slotKind: "content" | "structure";
  pickItems: readonly PhiStructureRegionPickItem[];
  pageDraftsByScope?: PhiBuilderPageDraftsMapByScope;
  serverPreview: ReactNode | null;
  regionLabels: PhiRegionWidgetLabels;
  pickerLabels: PhiBuilderCanvasPickerLabels;
}) {
  const currentDraft = usePhiDeveloperRegionDraft(getPhiBuilderRegionDraftKey(
    area,
    node.regionKey,
    isPhiBuilderPageScopedRegion(node.regionKey) ? pageKey : null,
  ));
  const regionLabel = regionLabels.regions[node.title];
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
      serverPreview={serverPreview}
      pickerLabels={pickerLabels}
      containerClassName="phi-builder-workspace-region-scaffold"
    />
  );
}

export function PhiDeveloperBuilderStructureCanvas({
  workspace = "structure",
  builderMode,
  area,
  pageKey,
  pageDraftsByScope,
  serverPreviewRegions,
  pickItems,
  regionLabels = PHI_REGION_WIDGET_DEFAULT_LABELS,
  pickerLabels = PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.canvas.picker,
}: PhiDeveloperBuilderStructureCanvasProps) {
  const { token } = usePhiConfig();
  const debugScaffold = usePhiDeveloperBuilderStateValue("public", (state) => state.debugScaffold);
  const isPreviewMode = builderMode === "preview";
  const isPagesWorkspace = workspace === "pages";
  const workspaceSpec = isPagesWorkspace ? PHI_PAGES_WORKSPACE_SPEC : PHI_STRUCTURE_WORKSPACE_SPEC;
  const slotKind = isPagesWorkspace ? "content" : "structure";

  /*
   * The two Sider drafts are the only ones this component reads itself, for the split's column widths.
   * Every other Region reads its own draft inside `PhiDeveloperBuilderCanvasRegion`, so a write to one
   * Region re-renders that Region and not the canvas with all of them.
   */
  const siderLeftDraft = usePhiDeveloperRegionDraft(getPhiBuilderRegionDraftKey(area, "sider_left", null));
  const siderRightDraft = usePhiDeveloperRegionDraft(getPhiBuilderRegionDraftKey(area, "sider_right", null));

  const renderRegion = (node: PhiDeveloperBuilderRegionSpec) => (
    <PhiDeveloperBuilderCanvasRegion
      key={node.regionKey}
      node={node}
      area={area}
      pageKey={pageKey}
      isPagesWorkspace={isPagesWorkspace}
      slotKind={slotKind}
      pickItems={pickItems}
      pageDraftsByScope={pageDraftsByScope}
      serverPreview={serverPreviewRegions?.[node.regionKey] ?? null}
      regionLabels={regionLabels}
      pickerLabels={pickerLabels}
    />
  );

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
            const width = resolvePhiBuilderSiderWidth(siderLeftDraft);
            return `${width} minmax(0, 1fr)`;
          }

          if (secondChild?.kind === "region" && secondChild.regionKey === "sider_right") {
            const width = resolvePhiBuilderSiderWidth(siderRightDraft);
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
              backgroundColor:
                builderMode === "preview"
                  ? token.colorFillQuaternary
                  : `color-mix(in srgb, ${token.colorBgLayout} 20%, transparent)`,
              width: "100%",
              alignSelf: "stretch",
            }, {
              "--phi-builder-content-body-min-height": node.bodyMinHeight ?? "280px",
              "--phi-builder-content-body-max-height": "none",
              "--phi-builder-content-body-padding": "0px",
              "--phi-builder-content-body-gap": "0px",
            })}
          >
            <div className="phi-builder-structure-canvas__content-body">
              {isPreviewMode ? null : node.children && node.children.length > 0 ? (
                node.children.map(renderWorkspaceNode)
              ) : (
                <PhiFlexControl
                  vertical
                  align="center"
                  justify="center"
                  gap={6}
                  style={{ minHeight: "var(--phi-builder-content-body-min-height)", padding: 24, textAlign: "center" }}
                >
                  <PhiTypographyControl strong>{regionLabels.structure.surface.contentTitle}</PhiTypographyControl>
                  <PhiTypographyControl type="secondary">
                    {regionLabels.structure.surface.contentDescription}
                  </PhiTypographyControl>
                </PhiFlexControl>
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
      <PhiFlexControl
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
      </PhiFlexControl>
      </div>
    </PhiStructureDndProvider>
  );
}
