"use client";

import { Flex, Typography } from "antd";
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

function renderSignalBlock(label: string, content: ReactNode, key?: string, action?: ReactNode) {
  return (
    <Flex key={key} vertical gap={4} style={{ width: "100%" }}>
      {action ? (
        <Flex align="center" justify="space-between" gap={8} style={{ width: "100%" }}>
          <Typography.Text style={{ lineHeight: "var(--ant-control-height)" }}>{label}</Typography.Text>
          {action}
        </Flex>
      ) : (
        <Typography.Text style={{ lineHeight: "var(--ant-control-height)" }}>{label}</Typography.Text>
      )}
      {content}
    </Flex>
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
          <Flex align="center" justify="space-between" gap={8}>
            <Typography.Text>{labels?.blocks.showStandardChannels ?? "Standard channels"}</Typography.Text>
            <PhiSwitchControl
              checked={showStandardReceives}
              onChange={setShowStandardReceives}
            />
          </Flex>,
        )}
      </div>
    </div>
  );
}
