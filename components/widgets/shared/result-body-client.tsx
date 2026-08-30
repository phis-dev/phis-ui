"use client";

import { Result } from "antd";

import type { PhiCmsResultWidgetConfig } from "../../../plugins/runtime-modules/core/widgets/result/config";

export type PhiResultWidgetBodyProps = {
  config?: Pick<PhiCmsResultWidgetConfig, "status">;
  code?: string;
  title?: string;
  subTitle?: string;
};

export function PhiResultWidgetBody({
  config,
  code,
  title,
  subTitle,
}: PhiResultWidgetBodyProps) {
  const renderedTitle = code && title && code !== title
    ? (
        <span style={{ display: "inline-flex", flexDirection: "column", gap: "var(--ant-padding-xxs)" }}>
          <span>{code}</span>
          <span style={{ fontSize: "var(--ant-font-size-lg)", fontWeight: 400 }}>{title}</span>
        </span>
      )
    : (title || code || "Information");

  return (
    <Result
      status={config?.status ?? "info"}
      title={renderedTitle}
      subTitle={subTitle}
    />
  );
}
