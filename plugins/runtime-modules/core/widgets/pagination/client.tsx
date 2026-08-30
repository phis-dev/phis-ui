"use client";

import { useState } from "react";

import { Flex, Typography } from "antd";

import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import type { PhiPaginationValue, PhiPaginationWidgetConfig } from "./config";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import { usePhiWidgetScaffoldPopup } from "../../../../../components/widgets/client/shared/phi-widget-scaffold-popup";
import { PhiPaginationControl } from "../../../../../components/controls/phi-pagination-control";

function normalizePaginationValue(value: Partial<PhiPaginationValue>, fallback: PhiPaginationValue): PhiPaginationValue {
  const page = Number.isInteger(value.page) && value.page != null && value.page > 0 ? value.page : fallback.page;
  const pageSize =
    Number.isInteger(value.pageSize) && value.pageSize != null && value.pageSize > 0 ? value.pageSize : fallback.pageSize;
  const total = Number.isInteger(value.total) && value.total != null && value.total >= 0 ? value.total : fallback.total;
  return { page, pageSize, total };
}

function coercePaginationValue(value: unknown, fallback: PhiPaginationValue): PhiPaginationValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return normalizePaginationValue(value as Partial<PhiPaginationValue>, fallback);
}

export function PhiPaginationWidget({
  config,
  signalsEnabled = true,
  onChange,
}: {
  config?: PhiPaginationWidgetConfig | null;
  signalsEnabled?: boolean;
  onChange?: (value: PhiPaginationValue) => void;
}) {
  const { token } = usePhiConfig();
  const popup = usePhiWidgetScaffoldPopup();
  const fallbackValue = {
    page: config?.page ?? 1,
    pageSize: config?.pageSize ?? 20,
    total: config?.total ?? 0,
  };
  const [state, setState] = useState(() => ({
    source: fallbackValue,
    value: fallbackValue,
  }));
  const value = state.source.page === fallbackValue.page &&
    state.source.pageSize === fallbackValue.pageSize &&
    state.source.total === fallbackValue.total
    ? state.value
    : fallbackValue;
  const controlSignals = usePhiControlSignalController<PhiPaginationValue>({
    key: config?.key ?? "pagination",
    signalRoutes: config?.signalRoutes,
    valueType: "json",
    typeKey: "pagination",
    signalsEnabled,
    initialDisabled: config?.disabled === true,
    initialReadOnly: config?.readOnly === true,
    clearValue: fallbackValue,
    onSetValue: (nextValue) => setState({ source: fallbackValue, value: normalizePaginationValue(nextValue, fallbackValue) }),
    coerceValue: (nextValue) => coercePaginationValue(nextValue, fallbackValue),
  });

  function publish(nextPage: number, nextPageSize: number) {
    if (controlSignals.readOnly) {
      return;
    }

    const nextValue = normalizePaginationValue({ page: nextPage, pageSize: nextPageSize }, fallbackValue);
    setState({
      source: fallbackValue,
      value: nextValue,
    });
    onChange?.(nextValue);
    controlSignals.emitChange(nextValue);
  }

  return (
    <Flex align="center" gap={token.paddingXS} style={{ minWidth: 0 }}>
      {config?.label ? (
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, whiteSpace: "nowrap" }}>
          {config.label}
        </Typography.Text>
      ) : null}
      <PhiPaginationControl
        page={value.page}
        pageSize={value.pageSize}
        total={value.total ?? config?.total ?? 0}
        disabled={controlSignals.disabled}
        readOnly={controlSignals.readOnly}
        showSizeChanger={config?.showSizeChanger}
        getPopupContainer={popup.getPopupContainer}
        popupRootClassName={popup.rootClassName}
        onPopupOpenChange={popup.setOpen}
        simple={config?.simple}
        size={config?.controlSize}
        onChange={(nextValue) => publish(nextValue.page, nextValue.pageSize)}
      />
    </Flex>
  );
}
