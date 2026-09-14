"use client";

import { Result } from "antd";

import type { PhiCmsResultWidgetConfig } from "../../../plugins/runtime-modules/core/widgets/result/config";
import { PhiButtonControl } from "../../controls/phi-button-control";

export type PhiResultWidgetBodyProps = {
  config?: Pick<PhiCmsResultWidgetConfig, "status" | "homeLink">;
  code?: string;
  title?: string;
  subTitle?: string;
  /**
   * Absent in the Canvas, where there is no Area to send anybody to: the target is resolved where the
   * result is rendered. Whether the link shows is `config.homeLink` and not this, so that switching it
   * in the Inspector shows up on the Canvas -- reading the target instead left an author toggling a
   * button they could not see.
   */
  homeHref?: string;
  homeLinkLabel?: string;
};

export function PhiResultWidgetBody({
  config,
  code,
  title,
  subTitle,
  homeHref,
  homeLinkLabel,
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
      extra={config?.homeLink
        ? <PhiButtonControl href={homeHref} label={homeLinkLabel} type="primary" />
        : undefined}
    />
  );
}
