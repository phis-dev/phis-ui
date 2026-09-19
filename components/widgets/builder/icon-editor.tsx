"use client";

import type { PhiCmsIconWidgetConfig } from "../../../plugins/runtime-modules/core/widgets/icon/config";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { PhiIconWidgetClient } from "../../../plugins/runtime-modules/core/widgets/icon/client";
import {
  PhiWidgetColorToolButton,
  PhiWidgetIconToolButton,
} from "../client/shared/phi-widget-tool-buttons";
import { usePhiAuthoringToolsLabels } from "../client/shared/phi-authoring-tools-labels";

export function PhiIconWidgetEditor({
  blockId,
  config,
}: {
  blockId: PhiCmsInstanceId;
  config: PhiCmsIconWidgetConfig;
}) {
  return <PhiIconWidgetClient blockId={blockId} config={config} />;
}

export function PhiIconWidgetEditorTools({
  config,
  onChange,
}: {
  config: PhiCmsIconWidgetConfig;
  onChange: (patch: Partial<PhiCmsIconWidgetConfig>) => void;
}) {
  const labels = usePhiAuthoringToolsLabels();
  return (
    <>
      <PhiWidgetIconToolButton
        value={config.icon ?? null}
        ariaLabel={labels.icon.widgetIcon}
        onChange={(icon) => onChange({ icon: icon ?? undefined })}
      />
      <PhiWidgetColorToolButton
        value={config.color ?? null}
        ariaLabel={labels.icon.widgetColor}
        onChange={(color) => onChange({ color: color ?? undefined })}
      />
    </>
  );
}
