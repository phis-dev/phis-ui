"use client";

import type { CSSProperties } from "react";

import type { PhiControlSize } from "../../types/control";
import type { PhiControlOption } from "../controls/phi-control-options";
import { PhiButtonControl } from "../controls/phi-button-control";
import { PhiCascaderControl } from "../controls/phi-cascader-control";
import { PhiToolbarControl } from "../controls/phi-toolbar-control";
import { resolvePhiButtonIcon } from "../widgets/client/shared/phi-button-icons";

export type PhiAssetFolderControlProps = {
  value?: string | null;
  options: readonly PhiControlOption[];
  placeholder?: string;
  createLabel?: string;
  showCreate?: boolean;
  allowClear?: boolean;
  size?: PhiControlSize;
  style?: CSSProperties;
  onChange?: (value: string) => void;
  onCreate?: () => void;
};

export function PhiAssetFolderControl({
  value,
  options,
  placeholder,
  createLabel,
  showCreate = false,
  allowClear = true,
  size,
  style,
  onChange,
  onCreate,
}: PhiAssetFolderControlProps) {
  const cascader = (
    <PhiCascaderControl
      value={value}
      options={options}
      placeholder={placeholder}
      allowRoot={false}
      allowClear={allowClear}
      expandTrigger="hover"
      rootValue="/"
      separator="/"
      normalize="raw"
      size={size}
      style={showCreate
        ? { flex: "1 1 auto", minWidth: 0, width: "auto" }
        : { width: "100%", ...style }}
      onChange={onChange}
    />
  );

  if (!showCreate || !onCreate) {
    return cascader;
  }

  return (
    <PhiToolbarControl compact size={size} style={{ width: "100%", ...style }}>
      {cascader}
      <PhiButtonControl
        ariaLabel={createLabel}
        tooltip={createLabel}
        icon={resolvePhiButtonIcon("add")}
        type="primary"
        size={size}
        onClick={onCreate}
      />
    </PhiToolbarControl>
  );
}
