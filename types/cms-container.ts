import type { CSSProperties } from "react";

import type { PhiCmsBackgroundWidgetConfig } from "../components/widgets/config/background";
import type { PhiCmsBorderWidgetConfig } from "./cms-config";
import type { PhiLayoutEffectId, PhiShadow } from "./layout-style";

export type PhiCmsContainerChromeConfig = {
  padding?: CSSProperties["padding"];
  paddingTop?: CSSProperties["paddingTop"];
  paddingRight?: CSSProperties["paddingRight"];
  paddingBottom?: CSSProperties["paddingBottom"];
  paddingLeft?: CSSProperties["paddingLeft"];
  background?: CSSProperties["background"];
  backgroundConfig?: PhiCmsBackgroundWidgetConfig | null;
  border?: boolean | CSSProperties["border"] | PhiCmsBorderWidgetConfig;
  shadow?: PhiShadow;
  effect?: PhiLayoutEffectId;
};
