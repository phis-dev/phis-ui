import type { PhiCalendarAdapterDescriptor } from "../../../types/calendar";
import type {
  PhiRuntimeModuleClientWidgetDefinition,
  PhiRuntimeModuleDataProviderDescriptor,
  PhiRuntimeModuleId,
} from "../../../types/cms-plugins";
import type { PhiRuntimeDataProviderKey } from "../../../types/runtime-data-provider";
import type { PhiControlOption } from "../../../components/controls/phi-control-options";
import type { PhiBuilderPluginMeta } from "../../../types/builder";

export type PhiBuilderModuleAuthoringCatalogEntry = {
  moduleId: PhiRuntimeModuleId;
  locked: boolean;
  plugins: readonly PhiBuilderPluginMeta[];
  widgetDefinitions: readonly PhiRuntimeModuleClientWidgetDefinition[];
  layoutTypes: readonly string[];
  dataProviderDescriptors: readonly PhiRuntimeModuleDataProviderDescriptor[];
  calendarAdapterDescriptors: readonly PhiCalendarAdapterDescriptor[];
  formOptions: readonly PhiControlOption[];
  authoringDataProviderKeys: readonly PhiRuntimeDataProviderKey[];
};
