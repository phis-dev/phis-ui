"use client";

import { createElement, lazy, Suspense, type ComponentType, type CSSProperties, type LazyExoticComponent } from "react";

/*
 * Every Ant Design icon a Phi icon name can stand for, one chunk each.
 *
 * The Button Widget resolved its icon through a switch over eighteen icons, `PhiIcon` through a registry
 * of fourteen more, and both imported every one of them: a Landing that drew one button and one link
 * icon preloaded all thirty-two, `next/image` and the button's whole table with them. Listed here as
 * loaders, an icon is fetched where it is drawn; rendered on the Server it is in the HTML already, and
 * hydration waits for its chunk rather than drawing it twice.
 *
 * Literal imports, not a template: a computed specifier would make the bundler emit every icon the
 * package has.
 */
const PHI_ANTD_ICON_LOADERS = {
  AlignCenterOutlined: () => import("@ant-design/icons/es/icons/AlignCenterOutlined"),
  AlignLeftOutlined: () => import("@ant-design/icons/es/icons/AlignLeftOutlined"),
  AlignRightOutlined: () => import("@ant-design/icons/es/icons/AlignRightOutlined"),
  ApartmentOutlined: () => import("@ant-design/icons/es/icons/ApartmentOutlined"),
  ApiOutlined: () => import("@ant-design/icons/es/icons/ApiOutlined"),
  AppleOutlined: () => import("@ant-design/icons/es/icons/AppleOutlined"),
  AppstoreOutlined: () => import("@ant-design/icons/es/icons/AppstoreOutlined"),
  ArrowDownOutlined: () => import("@ant-design/icons/es/icons/ArrowDownOutlined"),
  ArrowUpOutlined: () => import("@ant-design/icons/es/icons/ArrowUpOutlined"),
  AudioTwoTone: () => import("@ant-design/icons/es/icons/AudioTwoTone"),
  BgColorsOutlined: () => import("@ant-design/icons/es/icons/BgColorsOutlined"),
  BranchesOutlined: () => import("@ant-design/icons/es/icons/BranchesOutlined"),
  CalendarOutlined: () => import("@ant-design/icons/es/icons/CalendarOutlined"),
  CheckOutlined: () => import("@ant-design/icons/es/icons/CheckOutlined"),
  CloseOutlined: () => import("@ant-design/icons/es/icons/CloseOutlined"),
  CloudUploadOutlined: () => import("@ant-design/icons/es/icons/CloudUploadOutlined"),
  ClusterOutlined: () => import("@ant-design/icons/es/icons/ClusterOutlined"),
  CodeOutlined: () => import("@ant-design/icons/es/icons/CodeOutlined"),
  ColumnWidthOutlined: () => import("@ant-design/icons/es/icons/ColumnWidthOutlined"),
  CopyOutlined: () => import("@ant-design/icons/es/icons/CopyOutlined"),
  CustomerServiceOutlined: () => import("@ant-design/icons/es/icons/CustomerServiceOutlined"),
  DashboardOutlined: () => import("@ant-design/icons/es/icons/DashboardOutlined"),
  DeleteOutlined: () => import("@ant-design/icons/es/icons/DeleteOutlined"),
  DownOutlined: () => import("@ant-design/icons/es/icons/DownOutlined"),
  DownloadOutlined: () => import("@ant-design/icons/es/icons/DownloadOutlined"),
  EditOutlined: () => import("@ant-design/icons/es/icons/EditOutlined"),
  EnvironmentOutlined: () => import("@ant-design/icons/es/icons/EnvironmentOutlined"),
  ExperimentOutlined: () => import("@ant-design/icons/es/icons/ExperimentOutlined"),
  EyeInvisibleOutlined: () => import("@ant-design/icons/es/icons/EyeInvisibleOutlined"),
  EyeOutlined: () => import("@ant-design/icons/es/icons/EyeOutlined"),
  FileImageTwoTone: () => import("@ant-design/icons/es/icons/FileImageTwoTone"),
  FilePdfTwoTone: () => import("@ant-design/icons/es/icons/FilePdfTwoTone"),
  FileTextOutlined: () => import("@ant-design/icons/es/icons/FileTextOutlined"),
  FileTextTwoTone: () => import("@ant-design/icons/es/icons/FileTextTwoTone"),
  FileUnknownTwoTone: () => import("@ant-design/icons/es/icons/FileUnknownTwoTone"),
  FileZipTwoTone: () => import("@ant-design/icons/es/icons/FileZipTwoTone"),
  FolderAddOutlined: () => import("@ant-design/icons/es/icons/FolderAddOutlined"),
  FontColorsOutlined: () => import("@ant-design/icons/es/icons/FontColorsOutlined"),
  FontSizeOutlined: () => import("@ant-design/icons/es/icons/FontSizeOutlined"),
  FormOutlined: () => import("@ant-design/icons/es/icons/FormOutlined"),
  FormatPainterOutlined: () => import("@ant-design/icons/es/icons/FormatPainterOutlined"),
  GithubOutlined: () => import("@ant-design/icons/es/icons/GithubOutlined"),
  GlobalOutlined: () => import("@ant-design/icons/es/icons/GlobalOutlined"),
  GoogleOutlined: () => import("@ant-design/icons/es/icons/GoogleOutlined"),
  HddTwoTone: () => import("@ant-design/icons/es/icons/HddTwoTone"),
  HighlightTwoTone: () => import("@ant-design/icons/es/icons/HighlightTwoTone"),
  HistoryOutlined: () => import("@ant-design/icons/es/icons/HistoryOutlined"),
  HolderOutlined: () => import("@ant-design/icons/es/icons/HolderOutlined"),
  HomeOutlined: () => import("@ant-design/icons/es/icons/HomeOutlined"),
  IdcardOutlined: () => import("@ant-design/icons/es/icons/IdcardOutlined"),
  InfoCircleOutlined: () => import("@ant-design/icons/es/icons/InfoCircleOutlined"),
  LayoutOutlined: () => import("@ant-design/icons/es/icons/LayoutOutlined"),
  LeftOutlined: () => import("@ant-design/icons/es/icons/LeftOutlined"),
  LinkOutlined: () => import("@ant-design/icons/es/icons/LinkOutlined"),
  LogoutOutlined: () => import("@ant-design/icons/es/icons/LogoutOutlined"),
  MailOutlined: () => import("@ant-design/icons/es/icons/MailOutlined"),
  MenuFoldOutlined: () => import("@ant-design/icons/es/icons/MenuFoldOutlined"),
  MenuOutlined: () => import("@ant-design/icons/es/icons/MenuOutlined"),
  MenuUnfoldOutlined: () => import("@ant-design/icons/es/icons/MenuUnfoldOutlined"),
  MessageOutlined: () => import("@ant-design/icons/es/icons/MessageOutlined"),
  MinusOutlined: () => import("@ant-design/icons/es/icons/MinusOutlined"),
  MonitorOutlined: () => import("@ant-design/icons/es/icons/MonitorOutlined"),
  MoonOutlined: () => import("@ant-design/icons/es/icons/MoonOutlined"),
  NodeIndexOutlined: () => import("@ant-design/icons/es/icons/NodeIndexOutlined"),
  NotificationOutlined: () => import("@ant-design/icons/es/icons/NotificationOutlined"),
  PictureOutlined: () => import("@ant-design/icons/es/icons/PictureOutlined"),
  PlayCircleFilled: () => import("@ant-design/icons/es/icons/PlayCircleFilled"),
  PlusOutlined: () => import("@ant-design/icons/es/icons/PlusOutlined"),
  ProfileOutlined: () => import("@ant-design/icons/es/icons/ProfileOutlined"),
  QuestionCircleOutlined: () => import("@ant-design/icons/es/icons/QuestionCircleOutlined"),
  ReadOutlined: () => import("@ant-design/icons/es/icons/ReadOutlined"),
  RedoOutlined: () => import("@ant-design/icons/es/icons/RedoOutlined"),
  ReloadOutlined: () => import("@ant-design/icons/es/icons/ReloadOutlined"),
  RightOutlined: () => import("@ant-design/icons/es/icons/RightOutlined"),
  SafetyCertificateOutlined: () => import("@ant-design/icons/es/icons/SafetyCertificateOutlined"),
  SaveOutlined: () => import("@ant-design/icons/es/icons/SaveOutlined"),
  SearchOutlined: () => import("@ant-design/icons/es/icons/SearchOutlined"),
  SendOutlined: () => import("@ant-design/icons/es/icons/SendOutlined"),
  SettingOutlined: () => import("@ant-design/icons/es/icons/SettingOutlined"),
  ShareAltOutlined: () => import("@ant-design/icons/es/icons/ShareAltOutlined"),
  ShoppingCartOutlined: () => import("@ant-design/icons/es/icons/ShoppingCartOutlined"),
  ShoppingOutlined: () => import("@ant-design/icons/es/icons/ShoppingOutlined"),
  SkinOutlined: () => import("@ant-design/icons/es/icons/SkinOutlined"),
  StarOutlined: () => import("@ant-design/icons/es/icons/StarOutlined"),
  StopOutlined: () => import("@ant-design/icons/es/icons/StopOutlined"),
  SunOutlined: () => import("@ant-design/icons/es/icons/SunOutlined"),
  TableOutlined: () => import("@ant-design/icons/es/icons/TableOutlined"),
  TeamOutlined: () => import("@ant-design/icons/es/icons/TeamOutlined"),
  TranslationOutlined: () => import("@ant-design/icons/es/icons/TranslationOutlined"),
  UndoOutlined: () => import("@ant-design/icons/es/icons/UndoOutlined"),
  UnorderedListOutlined: () => import("@ant-design/icons/es/icons/UnorderedListOutlined"),
  UpOutlined: () => import("@ant-design/icons/es/icons/UpOutlined"),
  UploadOutlined: () => import("@ant-design/icons/es/icons/UploadOutlined"),
  UserAddOutlined: () => import("@ant-design/icons/es/icons/UserAddOutlined"),
  UserOutlined: () => import("@ant-design/icons/es/icons/UserOutlined"),
  VideoCameraTwoTone: () => import("@ant-design/icons/es/icons/VideoCameraTwoTone"),
  WarningOutlined: () => import("@ant-design/icons/es/icons/WarningOutlined"),
  WindowsOutlined: () => import("@ant-design/icons/es/icons/WindowsOutlined"),
} as const;

export type PhiAntdIconKey = keyof typeof PHI_ANTD_ICON_LOADERS;

/**
 * How an icon is presented, beyond which one it is. `twoToneColor` only means something to a two-tone
 * icon; the others ignore it.
 */
export type PhiAntdIconPresentation = {
  style?: CSSProperties;
  className?: string;
  title?: string;
  ariaLabel?: string;
  twoToneColor?: string;
};

type PhiAntdIconComponent = ComponentType<{
  style?: CSSProperties;
  className?: string;
  title?: string;
  "aria-label"?: string;
  twoToneColor?: string;
}>;

const lazyIcons = new Map<PhiAntdIconKey, LazyExoticComponent<PhiAntdIconComponent>>();

function readLazyIcon(icon: PhiAntdIconKey) {
  let Icon = lazyIcons.get(icon);
  if (!Icon) {
    Icon = lazy(PHI_ANTD_ICON_LOADERS[icon]);
    lazyIcons.set(icon, Icon);
  }
  return Icon;
}

/**
 * The names `PhiIcon` resolves to an Ant Design icon, bare or after `antd:`.
 *
 * The navigation and management names (`dashboard`, `team`, `translation`, ...) used to sit in a second,
 * separately loaded registry; with every icon its own chunk there is nothing left to keep apart.
 */
export const PHI_ANTD_ICON_NAMES: Readonly<Record<string, PhiAntdIconKey>> = {
  cluster: "ClusterOutlined",
  "cluster-outlined": "ClusterOutlined",
  send: "SendOutlined",
  "send-outlined": "SendOutlined",
  home: "HomeOutlined",
  "home-outlined": "HomeOutlined",
  mail: "MailOutlined",
  "mail-outlined": "MailOutlined",
  location: "EnvironmentOutlined",
  environment: "EnvironmentOutlined",
  "environment-outlined": "EnvironmentOutlined",
  global: "GlobalOutlined",
  "global-outlined": "GlobalOutlined",
  shopping: "ShoppingOutlined",
  "shopping-outlined": "ShoppingOutlined",
  "shopping-cart": "ShoppingCartOutlined",
  "shopping-cart-outlined": "ShoppingCartOutlined",
  star: "StarOutlined",
  "star-outlined": "StarOutlined",
  question: "QuestionCircleOutlined",
  "question-circle": "QuestionCircleOutlined",
  "question-circle-outlined": "QuestionCircleOutlined",
  info: "InfoCircleOutlined",
  "info-circle": "InfoCircleOutlined",
  "info-circle-outlined": "InfoCircleOutlined",
  logout: "LogoutOutlined",
  "logout-outlined": "LogoutOutlined",
  user: "UserOutlined",
  "user-outlined": "UserOutlined",
  google: "GoogleOutlined",
  "google-outlined": "GoogleOutlined",
  apple: "AppleOutlined",
  "apple-outlined": "AppleOutlined",
  github: "GithubOutlined",
  "github-outlined": "GithubOutlined",
  windows: "WindowsOutlined",
  "windows-outlined": "WindowsOutlined",
  apartment: "ApartmentOutlined",
  "apartment-outlined": "ApartmentOutlined",
  api: "ApiOutlined",
  "api-outlined": "ApiOutlined",
  appstore: "AppstoreOutlined",
  "appstore-outlined": "AppstoreOutlined",
  branches: "BranchesOutlined",
  "branches-outlined": "BranchesOutlined",
  check: "CheckOutlined",
  "check-outlined": "CheckOutlined",
  close: "CloseOutlined",
  "close-outlined": "CloseOutlined",
  code: "CodeOutlined",
  "code-outlined": "CodeOutlined",
  "column-width": "ColumnWidthOutlined",
  "column-width-outlined": "ColumnWidthOutlined",
  "customer-service": "CustomerServiceOutlined",
  "customer-service-outlined": "CustomerServiceOutlined",
  dashboard: "DashboardOutlined",
  "dashboard-outlined": "DashboardOutlined",
  delete: "DeleteOutlined",
  "delete-outlined": "DeleteOutlined",
  edit: "EditOutlined",
  "edit-outlined": "EditOutlined",
  download: "DownloadOutlined",
  "download-outlined": "DownloadOutlined",
  experiment: "ExperimentOutlined",
  "experiment-outlined": "ExperimentOutlined",
  file: "FileTextOutlined",
  "file-text": "FileTextOutlined",
  "file-search": "FileTextOutlined",
  "file-text-outlined": "FileTextOutlined",
  history: "HistoryOutlined",
  "history-outlined": "HistoryOutlined",
  menu: "MenuOutlined",
  "menu-outlined": "MenuOutlined",
  message: "MessageOutlined",
  "message-outlined": "MessageOutlined",
  notification: "NotificationOutlined",
  "notification-outlined": "NotificationOutlined",
  picture: "PictureOutlined",
  "picture-outlined": "PictureOutlined",
  plus: "PlusOutlined",
  "plus-outlined": "PlusOutlined",
  profile: "ProfileOutlined",
  "profile-outlined": "ProfileOutlined",
  calendar: "CalendarOutlined",
  "calendar-outlined": "CalendarOutlined",
  form: "FormOutlined",
  "form-outlined": "FormOutlined",
  read: "ReadOutlined",
  "read-outlined": "ReadOutlined",
  "safety-certificate": "SafetyCertificateOutlined",
  "safety-certificate-outlined": "SafetyCertificateOutlined",
  setting: "SettingOutlined",
  "setting-outlined": "SettingOutlined",
  skin: "SkinOutlined",
  "skin-outlined": "SkinOutlined",
  table: "TableOutlined",
  "table-outlined": "TableOutlined",
  team: "TeamOutlined",
  "team-outlined": "TeamOutlined",
  translation: "TranslationOutlined",
  "translation-outlined": "TranslationOutlined",
  "user-add": "UserAddOutlined",
  "user-add-outlined": "UserAddOutlined",
  "align-center": "AlignCenterOutlined",
  "align-center-outlined": "AlignCenterOutlined",
  "align-left": "AlignLeftOutlined",
  "align-left-outlined": "AlignLeftOutlined",
  "align-right": "AlignRightOutlined",
  "align-right-outlined": "AlignRightOutlined",
  "arrow-down": "ArrowDownOutlined",
  "arrow-down-outlined": "ArrowDownOutlined",
  "arrow-up": "ArrowUpOutlined",
  "arrow-up-outlined": "ArrowUpOutlined",
  "audio-two-tone": "AudioTwoTone",
  "bg-colors": "BgColorsOutlined",
  "bg-colors-outlined": "BgColorsOutlined",
  idcard: "IdcardOutlined",
  "idcard-outlined": "IdcardOutlined",
  "font-colors": "FontColorsOutlined",
  "font-colors-outlined": "FontColorsOutlined",
  copy: "CopyOutlined",
  "copy-outlined": "CopyOutlined",
  down: "DownOutlined",
  "down-outlined": "DownOutlined",
  "file-image-two-tone": "FileImageTwoTone",
  "file-pdf-two-tone": "FilePdfTwoTone",
  "file-text-two-tone": "FileTextTwoTone",
  "file-unknown-two-tone": "FileUnknownTwoTone",
  "file-zip-two-tone": "FileZipTwoTone",
  "font-size": "FontSizeOutlined",
  "font-size-outlined": "FontSizeOutlined",
  "format-painter": "FormatPainterOutlined",
  "format-painter-outlined": "FormatPainterOutlined",
  "hdd-two-tone": "HddTwoTone",
  "highlight-two-tone": "HighlightTwoTone",
  holder: "HolderOutlined",
  "holder-outlined": "HolderOutlined",
  layout: "LayoutOutlined",
  "layout-outlined": "LayoutOutlined",
  left: "LeftOutlined",
  "left-outlined": "LeftOutlined",
  "menu-fold": "MenuFoldOutlined",
  "menu-fold-outlined": "MenuFoldOutlined",
  "menu-unfold": "MenuUnfoldOutlined",
  "menu-unfold-outlined": "MenuUnfoldOutlined",
  monitor: "MonitorOutlined",
  "monitor-outlined": "MonitorOutlined",
  moon: "MoonOutlined",
  "moon-outlined": "MoonOutlined",
  "node-index": "NodeIndexOutlined",
  "node-index-outlined": "NodeIndexOutlined",
  "play-circle-filled": "PlayCircleFilled",
  right: "RightOutlined",
  "right-outlined": "RightOutlined",
  "share-alt": "ShareAltOutlined",
  "share-alt-outlined": "ShareAltOutlined",
  sun: "SunOutlined",
  "sun-outlined": "SunOutlined",
  "unordered-list": "UnorderedListOutlined",
  "unordered-list-outlined": "UnorderedListOutlined",
  up: "UpOutlined",
  "up-outlined": "UpOutlined",
  upload: "UploadOutlined",
  "upload-outlined": "UploadOutlined",
  "video-camera-two-tone": "VideoCameraTwoTone",
  warning: "WarningOutlined",
  "warning-outlined": "WarningOutlined",
  "cloud-upload": "CloudUploadOutlined",
  "cloud-upload-outlined": "CloudUploadOutlined",
  "eye-invisible": "EyeInvisibleOutlined",
  "eye-invisible-outlined": "EyeInvisibleOutlined",
  eye: "EyeOutlined",
  "eye-outlined": "EyeOutlined",
  "folder-add": "FolderAddOutlined",
  "folder-add-outlined": "FolderAddOutlined",
  link: "LinkOutlined",
  "link-outlined": "LinkOutlined",
  minus: "MinusOutlined",
  "minus-outlined": "MinusOutlined",
  redo: "RedoOutlined",
  "redo-outlined": "RedoOutlined",
  reload: "ReloadOutlined",
  "reload-outlined": "ReloadOutlined",
  save: "SaveOutlined",
  "save-outlined": "SaveOutlined",
  search: "SearchOutlined",
  "search-outlined": "SearchOutlined",
  stop: "StopOutlined",
  "stop-outlined": "StopOutlined",
  undo: "UndoOutlined",
  "undo-outlined": "UndoOutlined",
};

export function PhiAntdIcon({
  icon,
  size = "1em",
  style,
  className,
  title,
  ariaLabel,
  twoToneColor,
}: {
  icon: PhiAntdIconKey;
  size?: number | string;
} & PhiAntdIconPresentation) {
  const sizeStyle = size === "1em" ? undefined : { fontSize: size };
  const resolvedStyle = sizeStyle || style ? { ...sizeStyle, ...style } : undefined;
  return (
    <Suspense
      fallback={
        // The placeholder takes the icon's place and its look, so nothing shifts when the chunk arrives.
        <span
          className={className ? `anticon ${className}` : "anticon"}
          aria-hidden="true"
          style={{ display: "inline-flex", width: size, height: size, ...style }}
        />
      }
    >
      {createElement(readLazyIcon(icon), {
        style: resolvedStyle,
        className,
        title,
        "aria-label": ariaLabel,
        twoToneColor,
      })}
    </Suspense>
  );
}
