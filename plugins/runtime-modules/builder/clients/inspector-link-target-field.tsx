"use client";

import { useMemo } from "react";

import { PhiFlexControl } from "../../../../components/controls/phi-flex-control";
import { PhiInspectorFieldRow } from "../../../../components/widgets/inspector-field-row";
import { PhiLinkTargetControl } from "../../../../components/widgets/client/shared/phi-link-target-control";
import type { PhiLinkTarget } from "../../../../types/references";
import { buildPhiBuilderPageReferenceTree } from "../../../../helpers/page-reference-tree";
import { usePhiBuilderOfferedPageCatalog } from "../use-offered-page-catalog";
import { usePhiDeveloperBuilderStateValue } from "../developer-workspace-store";
import {
  PHI_INSPECTOR_WIDGET_DEFAULT_LABELS,
  type PhiInspectorLinkTargetLabels,
} from "../../../../components/widgets/label-types/inspector";

/**
 * The Inspector's link field: the shared link control (`phi-link-target-control.tsx`), offered the Pages
 * of the Area the Builder is working on.
 */
export function PhiInspectorLinkTargetFieldControl({
  value,
  disabled,
  labels = PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.fields.linkTarget,
  onChange,
}: {
  value: unknown;
  disabled?: boolean;
  labels?: PhiInspectorLinkTargetLabels;
  /**
   * The target as it now stands. `none` is set when the author answered "None" -- the link is gone, not
   * only incomplete -- so what depends on a link can go with it.
   */
  onChange?: (next: PhiLinkTarget | undefined, none?: boolean) => void;
}) {
  const state = usePhiDeveloperBuilderStateValue("public", (current) => current);
  const pages = usePhiBuilderOfferedPageCatalog(state, state.area);
  const options = useMemo(
    () => buildPhiBuilderPageReferenceTree(state.area, pages, pages, { landing: labels.landingPage }),
    [labels.landingPage, pages, state.area],
  );

  return (
    <PhiLinkTargetControl
      value={value}
      options={options}
      labels={labels}
      disabled={disabled}
      onChange={onChange}
      // A row like every switch in the Inspector: its words on the left, the switch in the control column.
      newTabRow={(control) => (
        <PhiInspectorFieldRow label={labels.newTab}>
          <PhiFlexControl align="center" style={{ minHeight: "var(--ant-control-height)" }}>
            {control}
          </PhiFlexControl>
        </PhiInspectorFieldRow>
      )}
    />
  );
}
