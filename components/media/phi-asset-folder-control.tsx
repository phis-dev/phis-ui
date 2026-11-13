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
  /** A new Folder goes below the chosen one, which a locked Folder refuses. */
  createDisabled?: boolean;
  /**
   * The lock of the chosen Folder, where the placement offers it: whether it is locked, and what the
   * button says either way. Without a chosen Folder there is nothing to lock and no button.
   */
  lock?: {
    locked: boolean;
    lockLabel: string;
    unlockLabel: string;
    pending?: boolean;
    onToggle: () => void;
  } | null;
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
  createDisabled = false,
  lock = null,
  allowClear = true,
  size,
  style,
  onChange,
  onCreate,
}: PhiAssetFolderControlProps) {
  const create = showCreate && onCreate ? (
    <PhiButtonControl
      ariaLabel={createLabel}
      tooltip={createLabel}
      icon={resolvePhiButtonIcon("add")}
      type="primary"
      size={size}
      disabled={createDisabled}
      onClick={onCreate}
    />
  ) : null;
  /*
   * Drawn as the state it is in: a closed lock on a locked Folder, an open one on an unlocked one, and
   * the tooltip names what pressing it does.
   */
  const lockButton = lock ? (
    <PhiButtonControl
      ariaLabel={lock.locked ? lock.unlockLabel : lock.lockLabel}
      tooltip={lock.locked ? lock.unlockLabel : lock.lockLabel}
      icon={resolvePhiButtonIcon(lock.locked ? "antd:lock" : "antd:unlock")}
      size={size}
      loading={lock.pending}
      onClick={lock.onToggle}
    />
  ) : null;
  const grouped = create != null || lockButton != null;
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
      style={grouped
        ? { flex: "1 1 auto", minWidth: 0, width: "auto" }
        : { width: "100%", ...style }}
      onChange={onChange}
    />
  );

  if (!grouped) {
    return cascader;
  }

  return (
    <PhiToolbarControl compact size={size} style={{ width: "100%", ...style }}>
      {cascader}
      {lockButton}
      {create}
    </PhiToolbarControl>
  );
}
