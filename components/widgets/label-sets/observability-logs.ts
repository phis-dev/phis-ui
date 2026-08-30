import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_OBSERVABILITY_LOGS_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:observability-logs",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    search_placeholder: "Search messages, events, and metadata",
    service_label: "Service",
    level_label: "Level",
    event_label: "Event",
    area_label: "Area",
    time_window_label: "Time window",
    time_window_last_hour: "Last hour",
    time_window_last_6_hours: "Last 6 hours",
    time_window_last_24_hours: "Last 24 hours",
    time_window_last_7_days: "Last 7 days",
    time_window_last_30_days: "Last 30 days",
    filter_server: "Server",
    filter_site: "Site",
    filter_shared: "Shared",
    filter_debug: "Debug",
    filter_info: "Info",
    filter_warning: "Warning",
    filter_error: "Error",
    column_time: "Time",
    column_level: "Level",
    column_service: "Service",
    column_event: "Event",
    column_area: "Area",
    column_user: "User",
    column_request_id: "Request ID",
    column_message: "Message",
    column_actions: "Actions",
    detail_title: "Log details",
    detail_meta: "Metadata",
    detail_error: "Error",
    detail_method: "Method",
    detail_path: "Path",
    detail_status: "Status",
    empty_title: "No logs found.",
    empty_text: "Adjust the filters or extend the time window.",
  },
});

export async function getPhiObservabilityLogsWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_OBSERVABILITY_LOGS_WIDGET_LABEL_SET);
  return {
    searchPlaceholder: labels.search_placeholder,
    serviceLabel: labels.service_label,
    levelLabel: labels.level_label,
    eventLabel: labels.event_label,
    areaLabel: labels.area_label,
    timeWindowLabel: labels.time_window_label,
    timeWindowOptions: {
      lastHour: labels.time_window_last_hour,
      last6Hours: labels.time_window_last_6_hours,
      last24Hours: labels.time_window_last_24_hours,
      last7Days: labels.time_window_last_7_days,
      last30Days: labels.time_window_last_30_days,
    },
    serviceOptions: {
      server: labels.filter_server,
      site: labels.filter_site,
      shared: labels.filter_shared,
    },
    levelOptions: {
      debug: labels.filter_debug,
      info: labels.filter_info,
      warn: labels.filter_warning,
      error: labels.filter_error,
    },
    columns: {
      time: labels.column_time,
      level: labels.column_level,
      service: labels.column_service,
      event: labels.column_event,
      area: labels.column_area,
      user: labels.column_user,
      requestId: labels.column_request_id,
      message: labels.column_message,
      actions: labels.column_actions,
    },
    detail: {
      title: labels.detail_title,
      meta: labels.detail_meta,
      error: labels.detail_error,
      method: labels.detail_method,
      path: labels.detail_path,
      status: labels.detail_status,
    },
    empty: {
      title: labels.empty_title,
      text: labels.empty_text,
    },
  };
}
