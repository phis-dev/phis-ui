"use client";

import {
  CheckOutlined,
  CloudUploadOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FolderAddOutlined,
  HistoryOutlined,
  LinkOutlined,
  MinusOutlined,
  PlusOutlined,
  RedoOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  StopOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import { PhiIcon } from "../../../shell/phi-icon";

export function resolvePhiButtonIcon(icon: string | null | undefined): ReactNode {
  const normalizedIcon = icon?.trim();
  const alias = normalizedIcon?.toLowerCase().startsWith("antd:")
    ? normalizedIcon.slice("antd:".length).toLowerCase()
    : normalizedIcon?.toLowerCase();
  switch (alias) {
    case "apply":
    case "check":
      return <CheckOutlined />;
    case "cancel":
    case "clear":
    case "close":
      return <CloseOutlined />;
    case "upload":
    case "cloud-upload":
    case "publish":
      return <CloudUploadOutlined />;
    case "delete":
    case "trash":
      return <DeleteOutlined />;
    case "edit":
    case "meta":
    case "settings":
      return <EditOutlined />;
    case "eye":
    case "preview":
    case "view":
      return <EyeOutlined />;
    case "eye-invisible":
    case "eye-invisible-outlined":
      return <EyeInvisibleOutlined />;
    case "folder-add":
    case "folder-add-outlined":
      return <FolderAddOutlined />;
    case "history":
      return <HistoryOutlined />;
    case "link":
    case "link-outlined":
      return <LinkOutlined />;
    case "minus":
    case "minus-outlined":
      return <MinusOutlined />;
    case "add":
    case "new":
    case "plus":
      return <PlusOutlined />;
    case "redo":
      return <RedoOutlined />;
    case "reload":
    case "refresh":
    case "reset":
    case "restore":
      return <ReloadOutlined />;
    case "save":
      return <SaveOutlined />;
    case "search":
      return <SearchOutlined />;
    case "stop":
    case "retire":
      return <StopOutlined />;
    case "undo":
      return <UndoOutlined />;
    default:
      return normalizedIcon?.includes(":")
        ? <PhiIcon name={normalizedIcon} size="1em" />
        : null;
  }
}
