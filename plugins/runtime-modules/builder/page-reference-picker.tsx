"use client";

import { LinkOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";

import type { PhiPageReference } from "../../../types/references";
import { PhiButtonControl } from "../../../components/controls/phi-button-control";
import type { PhiControlOption } from "../../../components/controls/phi-control-options";
import { PhiPopoverControl } from "../../../components/controls/phi-popover-control";
import { PhiSelectControl } from "../../../components/controls/phi-select-control";
import { resolvePhiBuilderCmsFetchPath } from "../../../helpers/cms-paths";
import {
  resolvePhiBuilderActivePageCatalog,
  type PhiPresetPageNode,
} from "../../../helpers/cms-page-catalog";
import { usePhiDeveloperBuilderStateValue } from "./developer-workspace-store";

export type PhiBuilderPageReferenceSelection = {
  reference: PhiPageReference;
  title: string;
  path: string;
};

export function collectPhiBuilderPageReferenceOptions(
  area: Parameters<typeof resolvePhiBuilderCmsFetchPath>[0],
  nodes: readonly PhiPresetPageNode[],
  allNodes: readonly PhiPresetPageNode[],
): Array<PhiControlOption<PhiPageReference> & { selection: PhiBuilderPageReferenceSelection }> {
  return nodes.flatMap((node) => {
    const current = node.reference && node.tombstoned !== true
      ? [{
          value: node.reference,
          label: node.title,
          description: resolvePhiBuilderCmsFetchPath(area, node.key, allNodes),
          selection: {
            reference: node.reference,
            title: node.title,
            path: resolvePhiBuilderCmsFetchPath(area, node.key, allNodes),
          },
        }]
      : [];
    return [
      ...current,
      ...collectPhiBuilderPageReferenceOptions(area, node.children ?? [], allNodes),
    ];
  });
}

export function PhiBuilderPageReferencePicker({
  ariaLabel = "Select internal Page",
  onSelect,
}: {
  ariaLabel?: string;
  onSelect: (selection: PhiBuilderPageReferenceSelection) => void;
}) {
  const state = usePhiDeveloperBuilderStateValue("public", (value) => value);
  const [open, setOpen] = useState(false);
  const pages = useMemo(() => resolvePhiBuilderActivePageCatalog(
    state.area,
    state.modulePresetPagesByArea,
    state.customPages,
    state.persistedPageCatalogByArea,
  ), [state.area, state.customPages, state.modulePresetPagesByArea, state.persistedPageCatalogByArea]);
  const options = useMemo(
    () => collectPhiBuilderPageReferenceOptions(state.area, pages, pages),
    [pages, state.area],
  );

  return (
    <PhiPopoverControl
      open={open}
      trigger="click"
      placement="bottomRight"
      onOpenChange={setOpen}
      content={(
        <PhiSelectControl<PhiPageReference>
          ariaLabel={ariaLabel}
          placeholder="Select Page"
          options={options}
          popupMatchSelectWidth={320}
          style={{ width: 280 }}
          onChange={(reference) => {
            const option = options.find((candidate) => candidate.value === reference);
            if (!option) return;
            onSelect(option.selection);
            setOpen(false);
          }}
        />
      )}
    >
      <span style={{ display: "inline-flex" }}>
        <PhiButtonControl
          type="text"
          size="small"
          ariaLabel={ariaLabel}
          icon={<LinkOutlined />}
          onClick={() => undefined}
        />
      </span>
    </PhiPopoverControl>
  );
}
