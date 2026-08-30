import type { PhiBlockRuntime } from "../../../../../types";
import { buildPhiVisibleAreaMenuItems } from "../../../../../components/widgets/area-menu-items";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiAreaMenuWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "viewer">;
};

export async function PhiAreaMenuWidget({ runtime }: PhiAreaMenuWidgetProps) {
  const items = buildPhiVisibleAreaMenuItems(runtime.viewer);
  if (items.length === 0) {
    return null;
  }

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.AreaMenu}
      componentProps={{
        runtime: { area: runtime.area, locale: runtime.locale },
        items,
      }}
    />
  );
}
