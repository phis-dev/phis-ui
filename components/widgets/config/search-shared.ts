import type { PhiCmsWidgetConfigBase } from "./parser-primitives";
import type { PhiControlConfig } from "./control-signal-config";

export type PhiCmsSearchWidgetConfig = PhiCmsWidgetConfigBase & PhiControlConfig & {
  value?: string;
  placeholder?: string;
  allowClear?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
  submitOnEnter?: boolean;
};
