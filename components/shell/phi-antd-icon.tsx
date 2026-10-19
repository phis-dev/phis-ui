"use client";

import { createElement, lazy, Suspense, type ComponentType, type CSSProperties, type LazyExoticComponent } from "react";
import AntdIconLight from "@ant-design/icons/es/components/AntdIconLight";
import type { IconDefinition } from "@ant-design/icons-svg/lib/types";

/*
 * Every Ant Design icon a Phi icon name can stand for, one chunk each.
 *
 * The Button Widget resolved its icon through a switch over eighteen icons, `PhiIcon` through a registry
 * of fourteen more, and both imported every one of them: a Landing that drew one button and one link
 * icon preloaded all thirty-two, `next/image` and the button's whole table with them. Listed here as
 * loaders, an icon is fetched where it is drawn; rendered on the Server it is in the HTML already, and
 * hydration waits for its chunk rather than drawing it twice.
 *
 * An outlined or filled icon loads its SVG definition alone and is drawn by `AntdIconLight`, imported
 * once above. Loading the package's ready icon component instead brought that component, its SVG
 * renderer and style insertion into every icon's chunk: a contact page carried eleven copies, ~20 kB
 * gzip, for icons of ~0.3 kB each. A two-tone icon still loads the package's component: its renderer
 * brings the colour palette along, which belongs only where a two-tone icon is drawn.
 *
 * Literal imports, not a template: a computed specifier would make the bundler emit every icon the
 * package has.
 */
const PHI_ANTD_ICON_LOADERS = {
  AlignCenterOutlined: () => import("@ant-design/icons-svg/es/asn/AlignCenterOutlined"),
  AlignLeftOutlined: () => import("@ant-design/icons-svg/es/asn/AlignLeftOutlined"),
  AlignRightOutlined: () => import("@ant-design/icons-svg/es/asn/AlignRightOutlined"),
  ApartmentOutlined: () => import("@ant-design/icons-svg/es/asn/ApartmentOutlined"),
  ApiOutlined: () => import("@ant-design/icons-svg/es/asn/ApiOutlined"),
  AppleOutlined: () => import("@ant-design/icons-svg/es/asn/AppleOutlined"),
  AppstoreOutlined: () => import("@ant-design/icons-svg/es/asn/AppstoreOutlined"),
  ArrowDownOutlined: () => import("@ant-design/icons-svg/es/asn/ArrowDownOutlined"),
  ArrowUpOutlined: () => import("@ant-design/icons-svg/es/asn/ArrowUpOutlined"),
  AudioTwoTone: () => import("@ant-design/icons/es/icons/AudioTwoTone"),
  BgColorsOutlined: () => import("@ant-design/icons-svg/es/asn/BgColorsOutlined"),
  BlockOutlined: () => import("@ant-design/icons-svg/es/asn/BlockOutlined"),
  BuildOutlined: () => import("@ant-design/icons-svg/es/asn/BuildOutlined"),
  BranchesOutlined: () => import("@ant-design/icons-svg/es/asn/BranchesOutlined"),
  CalendarOutlined: () => import("@ant-design/icons-svg/es/asn/CalendarOutlined"),
  CheckOutlined: () => import("@ant-design/icons-svg/es/asn/CheckOutlined"),
  CloseOutlined: () => import("@ant-design/icons-svg/es/asn/CloseOutlined"),
  CloudUploadOutlined: () => import("@ant-design/icons-svg/es/asn/CloudUploadOutlined"),
  ClusterOutlined: () => import("@ant-design/icons-svg/es/asn/ClusterOutlined"),
  CodeOutlined: () => import("@ant-design/icons-svg/es/asn/CodeOutlined"),
  ColumnWidthOutlined: () => import("@ant-design/icons-svg/es/asn/ColumnWidthOutlined"),
  CopyOutlined: () => import("@ant-design/icons-svg/es/asn/CopyOutlined"),
  CustomerServiceOutlined: () => import("@ant-design/icons-svg/es/asn/CustomerServiceOutlined"),
  DashOutlined: () => import("@ant-design/icons-svg/es/asn/DashOutlined"),
  DashboardOutlined: () => import("@ant-design/icons-svg/es/asn/DashboardOutlined"),
  DeleteOutlined: () => import("@ant-design/icons-svg/es/asn/DeleteOutlined"),
  DownOutlined: () => import("@ant-design/icons-svg/es/asn/DownOutlined"),
  DownloadOutlined: () => import("@ant-design/icons-svg/es/asn/DownloadOutlined"),
  EditOutlined: () => import("@ant-design/icons-svg/es/asn/EditOutlined"),
  EnvironmentOutlined: () => import("@ant-design/icons-svg/es/asn/EnvironmentOutlined"),
  ExperimentOutlined: () => import("@ant-design/icons-svg/es/asn/ExperimentOutlined"),
  EyeInvisibleOutlined: () => import("@ant-design/icons-svg/es/asn/EyeInvisibleOutlined"),
  EyeOutlined: () => import("@ant-design/icons-svg/es/asn/EyeOutlined"),
  FileImageTwoTone: () => import("@ant-design/icons/es/icons/FileImageTwoTone"),
  FilePdfTwoTone: () => import("@ant-design/icons/es/icons/FilePdfTwoTone"),
  FileTextOutlined: () => import("@ant-design/icons-svg/es/asn/FileTextOutlined"),
  FileTextTwoTone: () => import("@ant-design/icons/es/icons/FileTextTwoTone"),
  FileUnknownTwoTone: () => import("@ant-design/icons/es/icons/FileUnknownTwoTone"),
  FileZipTwoTone: () => import("@ant-design/icons/es/icons/FileZipTwoTone"),
  FolderAddOutlined: () => import("@ant-design/icons-svg/es/asn/FolderAddOutlined"),
  FontColorsOutlined: () => import("@ant-design/icons-svg/es/asn/FontColorsOutlined"),
  FontSizeOutlined: () => import("@ant-design/icons-svg/es/asn/FontSizeOutlined"),
  FormOutlined: () => import("@ant-design/icons-svg/es/asn/FormOutlined"),
  FormatPainterOutlined: () => import("@ant-design/icons-svg/es/asn/FormatPainterOutlined"),
  GithubOutlined: () => import("@ant-design/icons-svg/es/asn/GithubOutlined"),
  GlobalOutlined: () => import("@ant-design/icons-svg/es/asn/GlobalOutlined"),
  GoogleOutlined: () => import("@ant-design/icons-svg/es/asn/GoogleOutlined"),
  HddTwoTone: () => import("@ant-design/icons/es/icons/HddTwoTone"),
  HighlightTwoTone: () => import("@ant-design/icons/es/icons/HighlightTwoTone"),
  HistoryOutlined: () => import("@ant-design/icons-svg/es/asn/HistoryOutlined"),
  HolderOutlined: () => import("@ant-design/icons-svg/es/asn/HolderOutlined"),
  HomeOutlined: () => import("@ant-design/icons-svg/es/asn/HomeOutlined"),
  IdcardOutlined: () => import("@ant-design/icons-svg/es/asn/IdcardOutlined"),
  InfoCircleOutlined: () => import("@ant-design/icons-svg/es/asn/InfoCircleOutlined"),
  LayoutOutlined: () => import("@ant-design/icons-svg/es/asn/LayoutOutlined"),
  LeftOutlined: () => import("@ant-design/icons-svg/es/asn/LeftOutlined"),
  LinkOutlined: () => import("@ant-design/icons-svg/es/asn/LinkOutlined"),
  LogoutOutlined: () => import("@ant-design/icons-svg/es/asn/LogoutOutlined"),
  MailOutlined: () => import("@ant-design/icons-svg/es/asn/MailOutlined"),
  MenuFoldOutlined: () => import("@ant-design/icons-svg/es/asn/MenuFoldOutlined"),
  MenuOutlined: () => import("@ant-design/icons-svg/es/asn/MenuOutlined"),
  MenuUnfoldOutlined: () => import("@ant-design/icons-svg/es/asn/MenuUnfoldOutlined"),
  MessageOutlined: () => import("@ant-design/icons-svg/es/asn/MessageOutlined"),
  MinusOutlined: () => import("@ant-design/icons-svg/es/asn/MinusOutlined"),
  MonitorOutlined: () => import("@ant-design/icons-svg/es/asn/MonitorOutlined"),
  MoonOutlined: () => import("@ant-design/icons-svg/es/asn/MoonOutlined"),
  NodeIndexOutlined: () => import("@ant-design/icons-svg/es/asn/NodeIndexOutlined"),
  NotificationOutlined: () => import("@ant-design/icons-svg/es/asn/NotificationOutlined"),
  PictureOutlined: () => import("@ant-design/icons-svg/es/asn/PictureOutlined"),
  PlayCircleFilled: () => import("@ant-design/icons-svg/es/asn/PlayCircleFilled"),
  PlayCircleOutlined: () => import("@ant-design/icons-svg/es/asn/PlayCircleOutlined"),
  PlusOutlined: () => import("@ant-design/icons-svg/es/asn/PlusOutlined"),
  ProfileOutlined: () => import("@ant-design/icons-svg/es/asn/ProfileOutlined"),
  QuestionCircleOutlined: () => import("@ant-design/icons-svg/es/asn/QuestionCircleOutlined"),
  ReadOutlined: () => import("@ant-design/icons-svg/es/asn/ReadOutlined"),
  RedoOutlined: () => import("@ant-design/icons-svg/es/asn/RedoOutlined"),
  ReloadOutlined: () => import("@ant-design/icons-svg/es/asn/ReloadOutlined"),
  RightOutlined: () => import("@ant-design/icons-svg/es/asn/RightOutlined"),
  SafetyCertificateOutlined: () => import("@ant-design/icons-svg/es/asn/SafetyCertificateOutlined"),
  SaveOutlined: () => import("@ant-design/icons-svg/es/asn/SaveOutlined"),
  SearchOutlined: () => import("@ant-design/icons-svg/es/asn/SearchOutlined"),
  SendOutlined: () => import("@ant-design/icons-svg/es/asn/SendOutlined"),
  SettingOutlined: () => import("@ant-design/icons-svg/es/asn/SettingOutlined"),
  ShareAltOutlined: () => import("@ant-design/icons-svg/es/asn/ShareAltOutlined"),
  ShoppingCartOutlined: () => import("@ant-design/icons-svg/es/asn/ShoppingCartOutlined"),
  ShoppingOutlined: () => import("@ant-design/icons-svg/es/asn/ShoppingOutlined"),
  SkinOutlined: () => import("@ant-design/icons-svg/es/asn/SkinOutlined"),
  StarOutlined: () => import("@ant-design/icons-svg/es/asn/StarOutlined"),
  StopOutlined: () => import("@ant-design/icons-svg/es/asn/StopOutlined"),
  SunOutlined: () => import("@ant-design/icons-svg/es/asn/SunOutlined"),
  TableOutlined: () => import("@ant-design/icons-svg/es/asn/TableOutlined"),
  TeamOutlined: () => import("@ant-design/icons-svg/es/asn/TeamOutlined"),
  TranslationOutlined: () => import("@ant-design/icons-svg/es/asn/TranslationOutlined"),
  UndoOutlined: () => import("@ant-design/icons-svg/es/asn/UndoOutlined"),
  UnorderedListOutlined: () => import("@ant-design/icons-svg/es/asn/UnorderedListOutlined"),
  UpOutlined: () => import("@ant-design/icons-svg/es/asn/UpOutlined"),
  UploadOutlined: () => import("@ant-design/icons-svg/es/asn/UploadOutlined"),
  UserAddOutlined: () => import("@ant-design/icons-svg/es/asn/UserAddOutlined"),
  UserOutlined: () => import("@ant-design/icons-svg/es/asn/UserOutlined"),
  VideoCameraTwoTone: () => import("@ant-design/icons/es/icons/VideoCameraTwoTone"),
  WarningOutlined: () => import("@ant-design/icons-svg/es/asn/WarningOutlined"),
  WindowsOutlined: () => import("@ant-design/icons-svg/es/asn/WindowsOutlined"),
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

// A two-tone loader hands over the package's component; every other loader hands over the bare SVG.
function isIconDefinition(loaded: PhiAntdIconComponent | IconDefinition): loaded is IconDefinition {
  return typeof loaded === "object" && "icon" in loaded && "theme" in loaded;
}

const lazyIcons = new Map<PhiAntdIconKey, LazyExoticComponent<PhiAntdIconComponent>>();

function readLazyIcon(icon: PhiAntdIconKey) {
  let Icon = lazyIcons.get(icon);
  if (!Icon) {
    Icon = lazy(async (): Promise<{ default: PhiAntdIconComponent }> => {
      const loaded = (await PHI_ANTD_ICON_LOADERS[icon]()).default;
      if (!isIconDefinition(loaded)) return { default: loaded };
      return { default: (props) => createElement(AntdIconLight, { ...props, icon: loaded }) };
    });
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
  block: "BlockOutlined",
  "block-outlined": "BlockOutlined",
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
  dash: "DashOutlined",
  "dash-outlined": "DashOutlined",
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
  build: "BuildOutlined",
  "build-outlined": "BuildOutlined",
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
  "play-circle": "PlayCircleOutlined",
  "play-circle-filled": "PlayCircleFilled",
  "play-circle-outlined": "PlayCircleOutlined",
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
