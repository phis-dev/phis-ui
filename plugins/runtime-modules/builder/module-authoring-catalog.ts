import type { PhiCalendarAdapterDescriptor } from "../../../types/calendar";
import type {
  PhiRuntimeModuleClientWidgetDefinition,
  PhiRuntimeModuleDataProviderDescriptor,
  PhiRuntimeModuleId,
} from "../../../types/cms-plugins";
import type { PhiCollectionItemRendererDescriptor } from "../../../types/collection-provider";
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
  collectionItemRendererDescriptors: readonly PhiCollectionItemRendererDescriptor[];
  calendarAdapterDescriptors: readonly PhiCalendarAdapterDescriptor[];
  formOptions: readonly PhiControlOption[];
  authoringDataProviderKeys: readonly PhiRuntimeDataProviderKey[];
};
