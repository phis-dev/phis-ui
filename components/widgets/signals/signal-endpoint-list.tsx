"use client";

import { PhiFlexControl } from "../../controls/phi-flex-control";
import { PhiTagControl } from "../../controls/phi-tag-control";
import { PhiTableControl, type PhiTableControlColumn } from "../../controls/phi-table-control";

import type {
  PhiSignalInputCapability,
  PhiSignalOutputCapability,
} from "../../../types/signals";
import { PhiTypographyControl } from "../../controls/phi-typography-control";

function readSignalCapabilityTableKey(capability: PhiSignalInputCapability | PhiSignalOutputCapability) {
  return [
    capability.id,
    "channel" in capability ? capability.channel : "emit",
    capability.action,
    capability.valueType,
    capability.valueSchema ?? "",
    capability.target ?? "",
  ].join(":");
}

export function PhiSignalCapabilityList({
  capabilities,
  emptyLabel = "none",
  showCapability = false,
  showChannel = true,
  sortByChannel = false,
}: {
  capabilities: readonly (PhiSignalInputCapability | PhiSignalOutputCapability)[] | null | undefined;
  emptyLabel?: string;
  showCapability?: boolean;
  showChannel?: boolean;
  sortByChannel?: boolean;
}) {
  if (!capabilities || capabilities.length === 0) {
    return <PhiTypographyControl type="secondary">{emptyLabel}</PhiTypographyControl>;
  }

  type CapabilityRow = Record<string, unknown> & {
    key: string;
    capability: PhiSignalInputCapability | PhiSignalOutputCapability;
    id: string;
    action: string;
    valueType: string;
  };
  const columns: readonly PhiTableControlColumn<CapabilityRow>[] = [
    ...(showCapability ? [{
      title: "Capability",
      key: "capability",
      fieldPath: "id",
      sizing: { mode: "content" as const },
    }] : []),
    ...(showChannel ? [{
      title: "Channel",
      key: "channel",
      fieldPath: "capability",
      sizing: { mode: "content" as const },
      render: (_value: unknown, row: CapabilityRow) => "channel" in row.capability ? row.capability.channel : "—",
    }] : []),
    {
      title: "Action",
      key: "action",
      fieldPath: "action",
      sizing: { mode: "content" },
    },
    {
      title: "Value type",
      key: "valueType",
      fieldPath: "valueType",
      sizing: { mode: "fill" },
      render: (valueType, row) => (
        <PhiFlexControl align="center" gap={4} wrap style={{ display: "inline-flex" }}>
          <PhiTagControl style={{ marginInlineEnd: 0 }}>{String(valueType)}</PhiTagControl>
          {row.capability.valueSchema ? <PhiTypographyControl type="secondary">{row.capability.valueSchema}</PhiTypographyControl> : null}
        </PhiFlexControl>
      ),
    },
  ];
  const dataSource: CapabilityRow[] = capabilities.map((capability) => ({
    key: readSignalCapabilityTableKey(capability),
    capability,
    id: capability.id,
    action: capability.action,
    valueType: capability.valueType,
  }));
  if (sortByChannel) {
    dataSource.sort((left, right) => {
      const leftChannel = "channel" in left.capability ? left.capability.channel : "";
      const rightChannel = "channel" in right.capability ? right.capability.channel : "";
      return leftChannel.localeCompare(rightChannel) || left.action.localeCompare(right.action);
    });
  }

  return (
    <PhiTableControl
      rows={dataSource}
      rowIdentityPath="key"
      size="small"
      pagination={false}
      sortingMode="none"
      sorts={[]}
      columnOrder={columns.map((column) => column.key)}
      layout={{ mode: "auto", overflowX: "auto" }}
      columns={columns}
    />
  );
}
