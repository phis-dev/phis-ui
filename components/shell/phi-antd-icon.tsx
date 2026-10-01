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
  ApartmentOutlined: () => import("@ant-design/icons/es/icons/ApartmentOutlined"),
  ApiOutlined: () => import("@ant-design/icons/es/icons/ApiOutlined"),
  AppleOutlined: () => import("@ant-design/icons/es/icons/AppleOutlined"),
  AppstoreOutlined: () => import("@ant-design/icons/es/icons/AppstoreOutlined"),
  BranchesOutlined: () => import("@ant-design/icons/es/icons/BranchesOutlined"),
  CheckOutlined: () => import("@ant-design/icons/es/icons/CheckOutlined"),
  CloseOutlined: () => import("@ant-design/icons/es/icons/CloseOutlined"),
  CloudUploadOutlined: () => import("@ant-design/icons/es/icons/CloudUploadOutlined"),
  CodeOutlined: () => import("@ant-design/icons/es/icons/CodeOutlined"),
  ColumnWidthOutlined: () => import("@ant-design/icons/es/icons/ColumnWidthOutlined"),
  CustomerServiceOutlined: () => import("@ant-design/icons/es/icons/CustomerServiceOutlined"),
  DashboardOutlined: () => import("@ant-design/icons/es/icons/DashboardOutlined"),
  DeleteOutlined: () => import("@ant-design/icons/es/icons/DeleteOutlined"),
  DownloadOutlined: () => import("@ant-design/icons/es/icons/DownloadOutlined"),
  EditOutlined: () => import("@ant-design/icons/es/icons/EditOutlined"),
  EnvironmentOutlined: () => import("@ant-design/icons/es/icons/EnvironmentOutlined"),
  ExperimentOutlined: () => import("@ant-design/icons/es/icons/ExperimentOutlined"),
  EyeInvisibleOutlined: () => import("@ant-design/icons/es/icons/EyeInvisibleOutlined"),
  EyeOutlined: () => import("@ant-design/icons/es/icons/EyeOutlined"),
  FileTextOutlined: () => import("@ant-design/icons/es/icons/FileTextOutlined"),
  FolderAddOutlined: () => import("@ant-design/icons/es/icons/FolderAddOutlined"),
  GithubOutlined: () => import("@ant-design/icons/es/icons/GithubOutlined"),
  GlobalOutlined: () => import("@ant-design/icons/es/icons/GlobalOutlined"),
  GoogleOutlined: () => import("@ant-design/icons/es/icons/GoogleOutlined"),
  HistoryOutlined: () => import("@ant-design/icons/es/icons/HistoryOutlined"),
  HomeOutlined: () => import("@ant-design/icons/es/icons/HomeOutlined"),
  InfoCircleOutlined: () => import("@ant-design/icons/es/icons/InfoCircleOutlined"),
  LinkOutlined: () => import("@ant-design/icons/es/icons/LinkOutlined"),
  LogoutOutlined: () => import("@ant-design/icons/es/icons/LogoutOutlined"),
  MailOutlined: () => import("@ant-design/icons/es/icons/MailOutlined"),
  MenuOutlined: () => import("@ant-design/icons/es/icons/MenuOutlined"),
  MessageOutlined: () => import("@ant-design/icons/es/icons/MessageOutlined"),
  MinusOutlined: () => import("@ant-design/icons/es/icons/MinusOutlined"),
  NotificationOutlined: () => import("@ant-design/icons/es/icons/NotificationOutlined"),
  PictureOutlined: () => import("@ant-design/icons/es/icons/PictureOutlined"),
  PlusOutlined: () => import("@ant-design/icons/es/icons/PlusOutlined"),
  ProfileOutlined: () => import("@ant-design/icons/es/icons/ProfileOutlined"),
  QuestionCircleOutlined: () => import("@ant-design/icons/es/icons/QuestionCircleOutlined"),
  ReadOutlined: () => import("@ant-design/icons/es/icons/ReadOutlined"),
  RedoOutlined: () => import("@ant-design/icons/es/icons/RedoOutlined"),
  ReloadOutlined: () => import("@ant-design/icons/es/icons/ReloadOutlined"),
  SafetyCertificateOutlined: () => import("@ant-design/icons/es/icons/SafetyCertificateOutlined"),
  SaveOutlined: () => import("@ant-design/icons/es/icons/SaveOutlined"),
  SearchOutlined: () => import("@ant-design/icons/es/icons/SearchOutlined"),
  SettingOutlined: () => import("@ant-design/icons/es/icons/SettingOutlined"),
  ShoppingOutlined: () => import("@ant-design/icons/es/icons/ShoppingOutlined"),
  SkinOutlined: () => import("@ant-design/icons/es/icons/SkinOutlined"),
  StarOutlined: () => import("@ant-design/icons/es/icons/StarOutlined"),
  StopOutlined: () => import("@ant-design/icons/es/icons/StopOutlined"),
  TableOutlined: () => import("@ant-design/icons/es/icons/TableOutlined"),
  TeamOutlined: () => import("@ant-design/icons/es/icons/TeamOutlined"),
  TranslationOutlined: () => import("@ant-design/icons/es/icons/TranslationOutlined"),
  UndoOutlined: () => import("@ant-design/icons/es/icons/UndoOutlined"),
  UserAddOutlined: () => import("@ant-design/icons/es/icons/UserAddOutlined"),
  UserOutlined: () => import("@ant-design/icons/es/icons/UserOutlined"),
  WindowsOutlined: () => import("@ant-design/icons/es/icons/WindowsOutlined"),
} as const;

export type PhiAntdIconKey = keyof typeof PHI_ANTD_ICON_LOADERS;

type PhiAntdIconComponent = ComponentType<{ style?: CSSProperties }>;

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
};

export function PhiAntdIcon({
  icon,
  size = "1em",
}: {
  icon: PhiAntdIconKey;
  size?: number | string;
}) {
  return (
    <Suspense
      fallback={
        <span
          className="anticon"
          aria-hidden="true"
          style={{ display: "inline-flex", width: size, height: size }}
        />
      }
    >
      {createElement(readLazyIcon(icon), { style: size === "1em" ? undefined : { fontSize: size } })}
    </Suspense>
  );
}
