import type { CSSProperties } from "react";
import {
  trGlobal,
  trGlobalForLocale,
} from "../../../../../server-helpers/translate";
import type { PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiCmsDescriptionWidgetConfig } from "./config";
import {
  PHI_COLOR,
  PHI_FONT_SIZE,
  PHI_LINE_HEIGHT,
  PHI_RADIUS,
  PHI_SPACE,
} from "../../../../../theme/antd-css-var-contract";

export type PhiDescriptionWidgetLabels = {
  eyebrow?: string;
  title?: string;
  description?: string;
  asideTitle?: string;
  asideItems?: string[];
  footer?: string;
};

export type PhiDescriptionWidgetProps = PhiServerBlockBaseProps<
  PhiDescriptionWidgetLabels,
  PhiCmsDescriptionWidgetConfig
>;

async function translateLabel(
  locale: string | undefined,
  value: string | undefined,
) {
  if (!value) {
    return undefined;
  }

  return locale
    ? trGlobalForLocale(locale, value)
    : trGlobal(value);
}

export async function PhiDescriptionWidget({
  labels,
  config,
  runtime,
}: PhiDescriptionWidgetProps) {
  const locale = runtime?.locale.current;
  const eyebrow = await translateLabel(locale, labels.eyebrow ?? config?.eyebrow);
  const title = await translateLabel(locale, labels.title ?? config?.title);
  const description = await translateLabel(locale, labels.description ?? config?.description);
  const asideTitle = await translateLabel(locale, labels.asideTitle ?? config?.asideTitle);
  const asideItems = await Promise.all(
    (labels.asideItems ?? config?.asideItems ?? []).map((item) => translateLabel(locale, item)),
  );
  const footer = await translateLabel(locale, labels.footer ?? config?.footer);
  const resolvedAsideItems = asideItems.filter((item): item is string => Boolean(item));
  const stackStyle: CSSProperties = {
    display: "grid",
    gap: PHI_SPACE.lg,
    width: "100%",
  };
  const subStackStyle: CSSProperties = {
    display: "grid",
    gap: PHI_SPACE.sm,
    width: "100%",
  };
  const itemStackStyle: CSSProperties = {
    display: "grid",
    gap: PHI_SPACE.xs,
    width: "100%",
  };

  return (
    <div style={stackStyle}>
      {eyebrow ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            width: "fit-content",
            borderRadius: "9999px",
            paddingInline: PHI_SPACE.sm,
            paddingBlock: PHI_SPACE.xxs,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: PHI_COLOR.textTertiary,
            borderColor: PHI_COLOR.borderSecondary,
            background: PHI_COLOR.fillQuaternary,
            borderStyle: "solid",
            borderWidth: 1,
          }}
        >
          {eyebrow}
        </span>
      ) : null}
      {title || description ? (
        <div>
          {title ? (
            <h2
              style={{
                margin: 0,
                marginBottom: description ? PHI_SPACE.xs : 0,
                color: PHI_COLOR.textHeading,
                fontSize: PHI_FONT_SIZE.heading2,
                lineHeight: PHI_LINE_HEIGHT.heading2,
                fontWeight: 600,
              }}
            >
              {title}
            </h2>
          ) : null}
          {description ? (
            <p
              style={{
                margin: 0,
                marginBottom: 0,
                color: PHI_COLOR.textSecondary,
                fontSize: PHI_FONT_SIZE.lg,
                lineHeight: PHI_LINE_HEIGHT.lg,
              }}
            >
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {asideTitle || resolvedAsideItems.length > 0 ? (
        <div style={subStackStyle}>
          {asideTitle ? (
            <span
              style={{
                display: "block",
                fontSize: PHI_FONT_SIZE.base,
                lineHeight: PHI_LINE_HEIGHT.base,
                color: PHI_COLOR.textHeading,
                fontWeight: 600,
              }}
            >
              {asideTitle}
            </span>
          ) : null}
          <div style={itemStackStyle}>
            {resolvedAsideItems.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: PHI_SPACE.sm,
                  padding: `${PHI_SPACE.sm} ${PHI_SPACE.md}`,
                  borderRadius: PHI_RADIUS.base,
                  background: PHI_COLOR.bgContainer,
                  border: `1px solid ${PHI_COLOR.borderSecondary}`,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: PHI_SPACE.xs,
                    height: PHI_SPACE.xs,
                    marginTop: `calc((${PHI_FONT_SIZE.base} * ${PHI_LINE_HEIGHT.base} - ${PHI_SPACE.xs}) / 2)`,
                    borderRadius: "50%",
                    background: PHI_COLOR.primary,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: PHI_COLOR.text,
                    fontSize: PHI_FONT_SIZE.base,
                    lineHeight: PHI_LINE_HEIGHT.base,
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {footer ? (
        <p style={{ margin: 0, color: PHI_COLOR.textTertiary }}>
          {footer}
        </p>
      ) : null}
    </div>
  );
}
