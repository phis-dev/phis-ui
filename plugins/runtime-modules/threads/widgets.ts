import type { PhiRuntimeModuleWidgetDefinition } from "../contracts";

/*
 * None of its own. The conversation it shows is Core's Widget (`core/widgets/thread-conversation`), placed
 * by this Module's Page as by every other Module that runs conversations.
 */
export const PHI_THREADS_RUNTIME_MODULE_WIDGETS: readonly PhiRuntimeModuleWidgetDefinition[] = [] as const;
