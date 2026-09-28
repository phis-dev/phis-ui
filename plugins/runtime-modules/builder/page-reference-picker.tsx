"use client";

import { LinkOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";

import { PhiButtonControl } from "../../../components/controls/phi-button-control";
import { PhiPopoverControl } from "../../../components/controls/phi-popover-control";
import { PhiTreeSelectControl } from "../../../components/controls/phi-tree-select-control";
import { resolvePhiBuilderActivePageCatalog } from "../../../helpers/cms-page-catalog";
import {
  buildPhiBuilderPageReferenceTree,
  type PhiBuilderPageReferenceSelection,
} from "./page-reference-tree";
import { usePhiDeveloperBuilderStateValue } from "./developer-workspace-store";

export type { PhiBuilderPageReferenceSelection } from "./page-reference-tree";

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
    () => buildPhiBuilderPageReferenceTree(state.area, pages, pages),
    [pages, state.area],
  );

  return (
    <PhiPopoverControl
      open={open}
      trigger="click"
      placement="bottomRight"
      onOpenChange={setOpen}
      content={(
        <PhiTreeSelectControl<PhiBuilderPageReferenceSelection>
          ariaLabel={ariaLabel}
          placeholder="Select Page"
          options={options}
          popupMatchSelectWidth={320}
          style={{ width: 280 }}
          onChange={(_value, option) => {
            if (!option?.meta) return;
            onSelect(option.meta);
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
