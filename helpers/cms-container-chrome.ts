import type { CSSProperties } from "react";

import type { PhiCmsContainerChromeConfig } from "../types/cms-container";
import { resolvePhiBorderWidgetStyle } from "./border-widget-style";
import {
  combinePhiBoxShadows,
  composePhiLayoutEffectStyle,
  resolvePhiLayoutEffectStyle,
  resolvePhiShadow,
} from "./layout-style";
import { resolvePhiBackgroundWidgetStyle } from "../components/widgets/config/background";

export function resolvePhiCmsContainerChromeStyle(
  config: PhiCmsContainerChromeConfig,
): CSSProperties {
  const backgroundStyle = config.backgroundConfig != null
    ? config.backgroundConfig.base.kind === "none"
      ? { background: "transparent" }
      : resolvePhiBackgroundWidgetStyle({ ...config.backgroundConfig, effect: null })
    : config.background == null
      ? {}
      : { background: config.background };
  const effectStyle = resolvePhiLayoutEffectStyle({
    effect: config.effect,
    background: backgroundStyle.background ?? backgroundStyle.backgroundColor,
  }) ?? {};
  const borderStyle = config.border == null || config.border === false
    ? {}
    : config.border === true
      ? resolvePhiBorderWidgetStyle(null, {
          border: "1px solid var(--ant-color-border-secondary)",
        })
      : typeof config.border !== "object"
        ? { border: config.border }
        : resolvePhiBorderWidgetStyle(config.border);
  const boxShadow = combinePhiBoxShadows(
    backgroundStyle.boxShadow,
    effectStyle.boxShadow,
    resolvePhiShadow(config.shadow),
  );
  const chromeStyle = composePhiLayoutEffectStyle(backgroundStyle, effectStyle);

  return {
    ...chromeStyle,
    ...borderStyle,
    ...(boxShadow == null ? {} : { boxShadow }),
  };
}
