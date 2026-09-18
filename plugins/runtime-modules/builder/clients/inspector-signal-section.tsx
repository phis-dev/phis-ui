"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import type { PhiSignalsWidgetLabels } from "../../../../components/widgets/label-types/signals";
import { PhiSignalCapabilityList } from "../../../../components/widgets/signals/signal-endpoint-list";
import type {
  PhiSignalInputCapability,
  PhiSignalOutputCapability,
} from "../../../../types/signals";
import { PhiSwitchControl } from "../../../../components/controls/phi-switch-control";
import { PHI_RENDERABLE_BLOCK_RECEIVE_CHANNELS } from "../../../../components/widgets/signals/renderable-block-signal-capabilities";
import { PhiFlexControl } from "../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../components/controls/phi-typography-control";

function renderSignalBlock(label: string, content: ReactNode, key?: string, action?: ReactNode) {
  return (
    <PhiFlexControl key={key} vertical gap={4} style={{ width: "100%" }}>
      {action ? (
        <PhiFlexControl align="center" justify="space-between" gap={8} style={{ width: "100%" }}>
          <PhiTypographyControl style={{ lineHeight: "var(--ant-control-height)" }}>{label}</PhiTypographyControl>
          {action}
        </PhiFlexControl>
      ) : (
        <PhiTypographyControl style={{ lineHeight: "var(--ant-control-height)" }}>{label}</PhiTypographyControl>
      )}
      {content}
    </PhiFlexControl>
  );
}

function renderSignalCapabilities(
  capabilities: readonly (PhiSignalInputCapability | PhiSignalOutputCapability)[] | null | undefined,
  emptyLabel: string,
  options?: { showCapability?: boolean; showChannel?: boolean; sortByChannel?: boolean },
) {
  return <PhiSignalCapabilityList capabilities={capabilities} emptyLabel={emptyLabel} {...options} />;
}

export type PhiInspectorSignalSectionProps = {
  labels?: PhiSignalsWidgetLabels;
  emits: readonly PhiSignalOutputCapability[];
  listens: readonly PhiSignalInputCapability[];
};

export function PhiInspectorSignalSection({
  labels,
  emits,
  listens,
}: PhiInspectorSignalSectionProps) {
  const [showStandardReceives, setShowStandardReceives] = useState(false);
  const visibleListens = showStandardReceives
    ? listens
    : listens.filter((capability) => !PHI_RENDERABLE_BLOCK_RECEIVE_CHANNELS.has(capability.channel));
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--ant-padding-sm)",
        width: "100%",
      }}
    >
      <div>
        {renderSignalBlock(
          labels?.blocks.emits ?? "Emits",
          renderSignalCapabilities(emits, labels?.blocks.none ?? "none", {
            showCapability: true,
            showChannel: false,
          }),
          "signals-emits",
        )}
      </div>
      <div>
        {renderSignalBlock(
          labels?.blocks.receives ?? "Receives",
          renderSignalCapabilities(visibleListens, labels?.blocks.none ?? "none", { sortByChannel: true }),
          "signals-receives",
          <PhiFlexControl align="center" justify="space-between" gap={8}>
            <PhiTypographyControl>{labels?.blocks.showStandardChannels ?? "Standard channels"}</PhiTypographyControl>
            <PhiSwitchControl
              checked={showStandardReceives}
              onChange={setShowStandardReceives}
            />
          </PhiFlexControl>,
        )}
      </div>
    </div>
  );
}
