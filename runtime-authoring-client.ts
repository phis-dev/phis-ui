"use client";

export {
  createPhiRuntimeModuleAuthoringClient,
  definePhiAuthoringLayoutModuleLoader,
} from "./plugins/runtime-modules/client-authoring-module";
export type {
  PhiAuthoringLayoutDefinition,
  PhiAuthoringLayoutLoaderProps,
  PhiAuthoringLayoutModuleLoader,
  PhiRuntimeModuleAuthoringRegistration,
} from "./plugins/runtime-modules/client-authoring-module";
export {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "./plugins/runtime-modules/client-authoring-widget-module";
export type {
  PhiAuthoringWidgetModuleLoader,
  PhiAuthoringWidgetModuleProps,
} from "./plugins/runtime-modules/client-authoring-widget-module";
export { PhiStaticOptionsToolButton } from "./components/widgets/builder/phi-static-options-picker";
export { PhiStaticTableResourceEditor } from "./plugins/runtime-modules/core/widgets/table/static-resource-editor";
export {
  createPhiVersionedStaticTableProviderRegistration,
} from "./components/widgets/client/shared/phi-static-table-provider";
export type {
  PhiVersionedStaticTableResourceSnapshot,
  PhiVersionedStaticTableResourceStore,
} from "./components/widgets/client/shared/phi-static-table-provider";
