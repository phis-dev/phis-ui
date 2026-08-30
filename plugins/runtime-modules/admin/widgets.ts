import type { PhiRuntimeModuleWidgetDefinition } from "../contracts";

/**
 * The Admin base module currently contributes no Widgets: its Settings surface is composed from
 * generic Widgets (description, form, button) through the shared Settings page shell, and the
 * General settings form is a registered Runtime Module Form (see admin-settings-forms.ts).
 */
export const PHI_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [] as const;
