"use client";

import { Flex, Typography } from "antd";
import { useState } from "react";

import {
  createPhiRenderableBlockReceiver,
  usePhiRenderableBlockSignalListener,
} from "../../../../../components/runtime/renderable-block-runtime";
import { PhiLink } from "../../../../../components/navigation/phi-link";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import { resolvePhiWidgetFontFamily } from "../../../../../components/widgets/helpers/font-family";
import { resolvePhiWidgetFontSize } from "../../../../../components/widgets/helpers/font-size";
import type { PhiClientBlockBaseProps, PhiCmsInstanceId, PhiRenderableBlockRenderMode } from "../../../../../types";
import type { PhiWidgetFontFamilyKey, PhiWidgetFontSizeKey } from "../../../../../types/site-theme";

const PHI_LINE_HEIGHT_LG = 1.6;

export type PhiSimpleTextWidgetClientLabels = {
  text: string;
};

export type PhiSimpleTextWidgetClientConfig = {
  renderMode?: PhiRenderableBlockRenderMode;
  href?: string;
  icon?: string;
  color?: string;
  fontFamily?: PhiWidgetFontFamilyKey;
  fontSize?: PhiWidgetFontSizeKey;
  external?: boolean;
  newTab?: boolean;
  type?: "secondary" | "success" | "warning" | "danger";
  strong?: boolean;
  italic?: boolean;
  underline?: boolean;
  delete?: boolean;
  disabled?: boolean;
  code?: boolean;
};

export type PhiSimpleTextWidgetClientProps = PhiClientBlockBaseProps<
  PhiSimpleTextWidgetClientLabels,
  PhiSimpleTextWidgetClientConfig
> & {
  blockId: PhiCmsInstanceId;
};

export function PhiSimpleTextWidgetClient({
  blockId,
  labels,
  config,
}: PhiSimpleTextWidgetClientProps) {
  const { Text } = Typography;
  const { fonts, token } = usePhiConfig();
  const [textOverride, setTextOverride] = useState<string | null>(null);
  const [iconOverride, setIconOverride] = useState<{ active: boolean; value?: string }>({
    active: false,
    value: undefined,
  });
  const [colorOverride, setColorOverride] = useState<{ active: boolean; value?: string }>({
    active: false,
    value: undefined,
  });
  const [fontFamilyOverride, setFontFamilyOverride] = useState<{ active: boolean; value?: PhiWidgetFontFamilyKey }>({
    active: false,
    value: undefined,
  });
  const [fontSizeOverride, setFontSizeOverride] = useState<{ active: boolean; value?: PhiWidgetFontSizeKey }>({
    active: false,
    value: undefined,
  });
  const [styleOverride, setStyleOverride] = useState<{
    strong?: boolean;
    italic?: boolean;
    underline?: boolean;
    delete?: boolean;
    code?: boolean;
  }>({});
  const hasHref = typeof config?.href === "string" && config.href.trim().length > 0;
  const isLiveMode = config?.renderMode == null || config.renderMode === "live";
  const textValue = textOverride ?? labels.text;
  const iconValue = iconOverride.active ? iconOverride.value : config?.icon;
  const textColor = colorOverride.active ? colorOverride.value : config?.color;
  const fontFamilyValue = fontFamilyOverride.active ? fontFamilyOverride.value : config?.fontFamily;
  const fontSizeValue = fontSizeOverride.active ? fontSizeOverride.value : config?.fontSize;
  const styleValue = {
    strong: styleOverride.strong ?? config?.strong,
    italic: styleOverride.italic ?? config?.italic,
    underline: styleOverride.underline ?? config?.underline,
    delete: styleOverride.delete ?? config?.delete,
    disabled: config?.disabled,
    code: styleOverride.code ?? config?.code,
  };
  const resolvedFontFamily = styleValue.code
    ? token.fontFamilyCode
    : resolvePhiWidgetFontFamily(fontFamilyValue, fonts, token);
  const resolvedFontSize = resolvePhiWidgetFontSize(fontSizeValue, token, "lg");
  const receiver = createPhiRenderableBlockReceiver("widget", blockId);

  usePhiRenderableBlockSignalListener(receiver, (signal) => {
    if (signal.channel === "text") {
      const nextText = signal.value;
      if (typeof nextText === "string") {
        setTextOverride(nextText);
      }
      return;
    }

    if (signal.channel === "icon" && signal.action === "change") {
      const nextIcon =
        typeof signal.value === "string" && signal.value.trim().length > 0 ? signal.value : undefined;
      setIconOverride({
        active: true,
        value: nextIcon,
      });
      return;
    }

    if (signal.channel === "textColor" && signal.action === "change") {
      const nextColor =
        typeof signal.value === "string" && signal.value.trim().length > 0 ? signal.value : undefined;
      setColorOverride({
        active: true,
        value: nextColor,
      });
      return;
    }

    if (signal.channel === "fontFamily" && signal.action === "change") {
      const nextFontFamily = signal.value;
      const resolvedFontFamilyKey =
        nextFontFamily === "inherit" ||
        nextFontFamily === "system" ||
        nextFontFamily === "body" ||
        nextFontFamily === "mono" ||
        nextFontFamily === "serif" ||
        nextFontFamily === "accent" ||
        nextFontFamily === "display"
          ? nextFontFamily
          : undefined;
      setFontFamilyOverride({
        active: true,
        value: resolvedFontFamilyKey,
      });
      return;
    }

    if (signal.channel === "fontSize" && signal.action === "change") {
      const nextFontSize = signal.value;
      const resolvedFontSizeKey =
        nextFontSize === "inherit" ||
        nextFontSize === "xs" ||
        nextFontSize === "sm" ||
        nextFontSize === "base" ||
        nextFontSize === "lg" ||
        nextFontSize === "xl"
          ? nextFontSize
          : undefined;
      setFontSizeOverride({
        active: true,
        value: resolvedFontSizeKey,
      });
      return;
    }

    if (signal.channel !== "textStyle" || signal.action !== "change") {
      return;
    }
    const stylePayload = signal.value && typeof signal.value === "object" && !Array.isArray(signal.value)
      ? signal.value as Record<string, unknown>
      : {};

    setStyleOverride((current) => ({
      strong: typeof stylePayload.strong === "boolean" ? stylePayload.strong : current.strong,
      italic: typeof stylePayload.italic === "boolean" ? stylePayload.italic : current.italic,
      underline: typeof stylePayload.underline === "boolean" ? stylePayload.underline : current.underline,
      delete: typeof stylePayload.delete === "boolean" ? stylePayload.delete : current.delete,
      code: typeof stylePayload.code === "boolean" ? stylePayload.code : current.code,
    }));
  });

  const contentNode = (
    <Flex
      align="center"
      gap={8}
      style={{
        width: "fit-content",
        maxWidth: "100%",
        minWidth: 0,
        fontSize: resolvedFontSize ?? "inherit",
        lineHeight: resolvedFontSize ? PHI_LINE_HEIGHT_LG : "inherit",
        color: textColor ?? undefined,
        fontFamily: resolvedFontFamily,
      }}
    >
      {iconValue ? <PhiIcon name={iconValue} size="1.25em" /> : null}
      <Text
        type={config?.type}
        strong={styleValue.strong}
        italic={styleValue.italic}
        underline={styleValue.underline}
        delete={styleValue.delete}
        disabled={styleValue.disabled}
        code={styleValue.code}
        style={{
          color: textColor ?? "inherit",
          fontSize: resolvedFontSize ?? "inherit",
          lineHeight: resolvedFontSize ? PHI_LINE_HEIGHT_LG : "inherit",
          ...(resolvedFontFamily ? { fontFamily: resolvedFontFamily } : {}),
        }}
      >
        {textValue}
      </Text>
    </Flex>
  );

  if (!hasHref) {
    return contentNode;
  }

  return (
    <PhiLink
      href={config.href!}
      external={config.external}
      newTab={config.newTab}
      onClick={
        isLiveMode
          ? undefined
          : (event) => {
              event.preventDefault();
            }
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: "fit-content",
        maxWidth: "100%",
        ...(textColor ? { color: textColor } : {}),
      }}
    >
      {contentNode}
    </PhiLink>
  );
}
