"use client";

import type { PhiTableWidgetConfig } from "../../../types/table-widget";
import { PhiTableWidgetClient } from "../../../plugins/runtime-modules/core/widgets/table/client";
import {
  PHI_TABLE_WIDGET_DEFAULT_LABELS,
  type PhiTableWidgetLabels,
} from "../../widgets/label-types/table";

export function PhiStaticTableResourceEditor({
  config,
  labels = PHI_TABLE_WIDGET_DEFAULT_LABELS,
}: {
  config: PhiTableWidgetConfig;
  labels?: PhiTableWidgetLabels;
}) {
  if (!config.source) {
    throw new Error("Static Table resource authoring requires a Provider resource binding.");
  }
  return <PhiTableWidgetClient config={config} labels={labels} />;
}
