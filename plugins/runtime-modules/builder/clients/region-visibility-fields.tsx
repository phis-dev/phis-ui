"use client";

import { useMemo } from "react";

import { PhiTreeCascaderControl } from "../../../../components/controls/phi-cascader-control";
import { PhiTypographyControl } from "../../../../components/controls/phi-typography-control";
import type { PhiInspectorRegionVisibilityLabels } from "../../../../components/widgets/label-types/inspector";
import { isPhiCmsShellOwnedRegion } from "../../../../helpers/cms-region-keys";
import {
  buildPhiBuilderPageScopeTree,
  PHI_PAGE_SCOPE_FOLDER_VALUE_PREFIX,
} from "../../../../helpers/page-reference-tree";
import { readPhiCmsRegionPageScopeEntries } from "../../../../helpers/region-page-scope";
import type { PhiCmsConfigField } from "../../../../types/cms-plugins";
import {
  PHI_CMS_REGION_PAGE_SCOPE_MODES,
  PHI_CMS_REGION_REVEAL_MODES,
  PhiCmsRegionPageScopeEntryFlag,
  type PhiCmsRegionPageScopeEntry,
  type PhiCmsRegionPageScopeMode,
  type PhiCmsRegionReveal,
} from "../../../../types/cms-presets";
import { readPhiPageReference } from "../../../../types/references";
import type { PhiTreeOption } from "../../../../types/tree";
import { usePhiDeveloperBuilderStateValue } from "../developer-workspace-store";
import { usePhiBuilderOfferedPageCatalog } from "../use-offered-page-catalog";
import { renderPhiInspectorConfigField, renderPhiInspectorSettingsRow } from "./inspector-config-field";

const PHI_GAP_SM = "var(--ant-padding-sm)";

/**
 * The Region config with a new Page scope and reveal. `all` and `always` are what a Region does without
 * either, so they are stored as nothing; a list mode keeps its entries even while there are none, so the
 * choice an author just made does not jump back before they pick the first Page.
 */
function patchRegionConfigVisibility(
  regionConfig: Record<string, unknown> | null | undefined,
  patch: { mode?: PhiCmsRegionPageScopeMode; entries?: PhiCmsRegionPageScopeEntry[]; reveal?: PhiCmsRegionReveal },
) {
  const next = { ...(regionConfig ?? {}) };
  const current = readRegionDraftPageScope(regionConfig);
  const mode = patch.mode ?? current.mode;
  if (mode === "all") {
    delete next.pageScope;
  } else {
    next.pageScope = mode === "root" ? { mode } : { mode, entries: patch.entries ?? current.entries };
  }
  if (patch.reveal === "always") {
    delete next.reveal;
  } else if (patch.reveal) {
    next.reveal = patch.reveal;
  }
  return next;
}

function readRegionDraftPageScope(regionConfig: Record<string, unknown> | null | undefined) {
  const scope = regionConfig?.pageScope as { mode?: unknown; entries?: unknown } | undefined;
  const mode = PHI_CMS_REGION_PAGE_SCOPE_MODES.find((entry) => entry === scope?.mode) ?? "all";
  return { mode, entries: readPhiCmsRegionPageScopeEntries(scope?.entries) };
}

function readRegionDraftReveal(regionConfig: Record<string, unknown> | null | undefined): PhiCmsRegionReveal {
  return PHI_CMS_REGION_REVEAL_MODES.find((entry) => entry === regionConfig?.reveal) ?? "always";
}

/** What the picker shows an entry as: a Page by its reference, a folder by its marked path. */
function toPickerValue(entry: PhiCmsRegionPageScopeEntry): string | null {
  if ("folder" in entry) {
    return `${PHI_PAGE_SCOPE_FOLDER_VALUE_PREFIX}${entry.folder}`;
  }
  return entry.pageLinkTarget.kind === "page" ? entry.pageLinkTarget.reference : null;
}

function collectNodesWithChildren(nodes: readonly PhiTreeOption[], into = new Set<string>()) {
  for (const node of nodes) {
    if (node.children?.length) {
      into.add(node.value);
      collectNodesWithChildren(node.children, into);
    }
  }
  return into;
}

/**
 * The Region Inspector's Visibility section (SHELL.md "Region visibility per Page").
 *
 * Every field is a row of the Inspector's two columns. The two choices are config fields like any
 * other, so they draw themselves; the Pages are a row of their own because they are a tree, as the link
 * field is, offered from the Pages the Area actually answers.
 */
export function PhiRegionVisibilityFields({
  regionKey,
  regionConfig,
  disabled,
  labels,
  onChange,
}: {
  regionKey: string;
  regionConfig: Record<string, unknown> | null | undefined;
  disabled: boolean;
  labels: PhiInspectorRegionVisibilityLabels;
  onChange: (regionConfig: Record<string, unknown>) => void;
}) {
  const state = usePhiDeveloperBuilderStateValue("public", (current) => current);
  const pages = usePhiBuilderOfferedPageCatalog(state, state.area);
  const tree = useMemo(
    () => buildPhiBuilderPageScopeTree(state.area, pages, pages, { landing: labels.landing }),
    [labels.landing, pages, state.area],
  );
  const subtreeValues = useMemo(() => collectNodesWithChildren(tree), [tree]);

  if (!isPhiCmsShellOwnedRegion(regionKey)) {
    return <PhiTypographyControl type="secondary">{labels.pageOwned}</PhiTypographyControl>;
  }

  const scope = readRegionDraftPageScope(regionConfig);
  const reveal = readRegionDraftReveal(regionConfig);
  const viewConfig = { pageScopeMode: scope.mode, reveal };
  const modeLabels: Record<PhiCmsRegionPageScopeMode, string> = {
    all: labels.all,
    root: labels.root,
    include: labels.include,
    exclude: labels.exclude,
  };
  const revealLabels: Record<PhiCmsRegionReveal, string> = {
    always: labels.always,
    hover: labels.hover,
    "scroll-up": labels.scrollUp,
  };
  const fields: PhiCmsConfigField[] = [
    {
      key: "pageScopeMode",
      type: "choice",
      label: labels.pages,
      options: PHI_CMS_REGION_PAGE_SCOPE_MODES.map((mode) => ({ value: mode, label: modeLabels[mode] })),
    },
    ...(regionKey === "header_top"
      ? [{
          key: "reveal",
          type: "choice",
          label: labels.reveal,
          options: PHI_CMS_REGION_REVEAL_MODES.map((mode) => ({ value: mode, label: revealLabels[mode] })),
        } satisfies PhiCmsConfigField]
      : []),
  ];
  const renderField = (field: PhiCmsConfigField) => renderPhiInspectorConfigField({
    field,
    value: viewConfig[field.key as keyof typeof viewConfig],
    defaultValue: undefined,
    config: viewConfig,
    disabled,
    onChange: (patch) => onChange(patchRegionConfigVisibility(regionConfig, {
      ...(typeof patch.pageScopeMode === "string" ? { mode: patch.pageScopeMode as PhiCmsRegionPageScopeMode } : {}),
      ...(typeof patch.reveal === "string" ? { reveal: patch.reveal as PhiCmsRegionReveal } : {}),
    })),
  });

  return (
    <div style={{ display: "grid", gap: PHI_GAP_SM, width: "100%" }}>
      {renderField(fields[0])}
      {scope.mode === "include" || scope.mode === "exclude"
        ? renderPhiInspectorSettingsRow(
          labels.entries,
          <PhiTreeCascaderControl
            disabled={disabled}
            options={tree}
            placeholder={labels.entriesPlaceholder}
            value={scope.entries.flatMap((entry) => toPickerValue(entry) ?? [])}
            onChange={(values) => onChange(patchRegionConfigVisibility(regionConfig, {
              entries: values.flatMap((value): PhiCmsRegionPageScopeEntry[] => {
                if (value.startsWith(PHI_PAGE_SCOPE_FOLDER_VALUE_PREFIX)) {
                  return [{ folder: value.slice(PHI_PAGE_SCOPE_FOLDER_VALUE_PREFIX.length) }];
                }
                const reference = readPhiPageReference(value)?.reference;
                if (!reference) {
                  return [];
                }
                return [{
                  pageLinkTarget: { kind: "page", reference },
                  ...(subtreeValues.has(value) ? { flags: PhiCmsRegionPageScopeEntryFlag.Subtree } : {}),
                }];
              }),
            }))}
          />,
          "pageScopeEntries",
        )
        : null}
      {fields.slice(1).map(renderField)}
    </div>
  );
}
