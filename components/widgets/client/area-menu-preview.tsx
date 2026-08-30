"use client";

import { resolvePhiCmsAreaLabel } from "../../../constants/cms-areas";
import type { PhiBlockRuntime } from "../../../types";
import { PhiAreaMenuWidgetClient, type PhiAreaMenuItem } from "../../../plugins/runtime-modules/core/widgets/area-menu/client";

function buildAreaMenuPreviewItems(): PhiAreaMenuItem[] {
  return [
    { key: "app", label: resolvePhiCmsAreaLabel("app"), href: "/app", disabled: true },
    { key: "builder", label: resolvePhiCmsAreaLabel("builder"), href: "/builder", disabled: true },
    { key: "editor", label: resolvePhiCmsAreaLabel("editor"), href: "/editor", disabled: true },
    { key: "accounting", label: resolvePhiCmsAreaLabel("accounting"), href: "/accounting", disabled: true },
  ];
}

export type PhiAreaMenuWidgetPreviewProps = {
  locale?: PhiBlockRuntime["locale"];
};

export function PhiAreaMenuWidgetPreview({ locale }: PhiAreaMenuWidgetPreviewProps) {
  return (
    <div>
      <PhiAreaMenuWidgetClient
        runtime={{
          area: "app",
          locale: locale ?? { current: "en" },
        }}
        items={buildAreaMenuPreviewItems()}
      />
    </div>
  );
}
