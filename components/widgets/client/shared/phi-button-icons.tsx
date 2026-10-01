"use client";

import type { ReactNode } from "react";
import { PhiAntdIcon } from "../../../shell/phi-antd-icon";
import { PhiIcon } from "../../../shell/phi-icon";

export function resolvePhiButtonIcon(icon: string | null | undefined): ReactNode {
  const normalizedIcon = icon?.trim();
  const alias = normalizedIcon?.toLowerCase().startsWith("antd:")
    ? normalizedIcon.slice("antd:".length).toLowerCase()
    : normalizedIcon?.toLowerCase();
  switch (alias) {
    case "apply":
    case "check":
      return <PhiAntdIcon icon="CheckOutlined" />;
    case "cancel":
    case "clear":
    case "close":
      return <PhiAntdIcon icon="CloseOutlined" />;
    case "upload":
    case "cloud-upload":
    case "publish":
      return <PhiAntdIcon icon="CloudUploadOutlined" />;
    case "delete":
    case "trash":
      return <PhiAntdIcon icon="DeleteOutlined" />;
    case "edit":
    case "meta":
    case "settings":
      return <PhiAntdIcon icon="EditOutlined" />;
    case "eye":
    case "preview":
    case "view":
      return <PhiAntdIcon icon="EyeOutlined" />;
    case "eye-invisible":
    case "eye-invisible-outlined":
      return <PhiAntdIcon icon="EyeInvisibleOutlined" />;
    case "folder-add":
    case "folder-add-outlined":
      return <PhiAntdIcon icon="FolderAddOutlined" />;
    case "history":
      return <PhiAntdIcon icon="HistoryOutlined" />;
    case "link":
    case "link-outlined":
      return <PhiAntdIcon icon="LinkOutlined" />;
    case "minus":
    case "minus-outlined":
      return <PhiAntdIcon icon="MinusOutlined" />;
    case "add":
    case "new":
    case "plus":
      return <PhiAntdIcon icon="PlusOutlined" />;
    case "redo":
      return <PhiAntdIcon icon="RedoOutlined" />;
    case "reload":
    case "refresh":
    case "reset":
    case "restore":
      return <PhiAntdIcon icon="ReloadOutlined" />;
    case "save":
      return <PhiAntdIcon icon="SaveOutlined" />;
    case "search":
      return <PhiAntdIcon icon="SearchOutlined" />;
    case "stop":
    case "retire":
      return <PhiAntdIcon icon="StopOutlined" />;
    case "undo":
      return <PhiAntdIcon icon="UndoOutlined" />;
    default:
      return normalizedIcon?.includes(":")
        ? <PhiIcon name={normalizedIcon} size="1em" />
        : null;
  }
}
