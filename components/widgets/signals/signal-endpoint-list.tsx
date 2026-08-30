"use client";

import { Space, Tag, Typography } from "antd";
import { PhiTableControl, type PhiTableControlColumn } from "../../controls/phi-table-control";

import type {
  PhiSignalInputCapability,
  PhiSignalOutputCapability,
} from "../../../types/signals";

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
    return <Typography.Text type="secondary">{emptyLabel}</Typography.Text>;
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
        <Space size={4} wrap>
          <Tag style={{ marginInlineEnd: 0 }}>{String(valueType)}</Tag>
          {row.capability.valueSchema ? <Typography.Text type="secondary">{row.capability.valueSchema}</Typography.Text> : null}
        </Space>
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
