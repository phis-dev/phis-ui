"use client";

import { PhiDescriptionListControl } from "../../../../../components/controls/phi-description-list-control";
import { PhiEmptyControl } from "../../../../../components/controls/phi-empty-control";
import { PHI_RECORD_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/record";
import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import type { PhiRecordWidgetConfig } from "../../../../../types/record-widget";
import { PHI_RECORD_WIDGET_DEFINITION } from "./config";

/*
 * The record as it will stand, before any row was opened: the configured fields in their appearance and
 * columns, each showing the Provider field it reads where the value will be. The Canvas has no row to
 * load -- a record arrives as a signal from a Table -- so the shape is what the author can judge here.
 */
export const PHI_RECORD_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiRecordWidgetConfig>(
  PHI_RECORD_WIDGET_DEFINITION,
  ({ config }) => config.presentation.fields.length === 0
    ? <PhiEmptyControl description={PHI_RECORD_WIDGET_DEFAULT_LABELS.empty} />
    : (
      <PhiDescriptionListControl
        presentation={config.presentation.appearance}
        columns={config.presentation.columns}
        items={config.presentation.fields.map((field) => ({
          key: field.key,
          label: field.label,
          full: field.full,
          value: <span style={{ color: "var(--ant-color-text-tertiary)" }}>{field.fieldKey}</span>,
        }))}
      />
    ),
);
