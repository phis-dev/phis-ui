"use client";

import {
  ApiOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  ClusterOutlined,
  CodeOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  EditOutlined,
  FileTextOutlined,
  HistoryOutlined,
  LayoutOutlined,
  MenuOutlined,
  MonitorOutlined,
  PictureOutlined,
  ReadOutlined,
  SettingOutlined,
  ShoppingOutlined,
  SkinOutlined,
  TeamOutlined,
  TranslationOutlined,
  UserOutlined,
} from "@ant-design/icons";

type PhiWidgetIconProps = {
  family: string;
  size?: number | string;
};

const WIDGET_ICON_REGISTRY = {
  layout: LayoutOutlined,
  content: AppstoreOutlined,
  basic: FileTextOutlined,
  navigation: MenuOutlined,
  form: ReadOutlined,
  forms: ReadOutlined,
  commerce: ShoppingOutlined,
  auth: UserOutlined,
  admin: SettingOutlined,
  builder: BranchesOutlined,
  dashboard: DashboardOutlined,
  developer: CodeOutlined,
  editor: EditOutlined,
  groups: ClusterOutlined,
  internal: BranchesOutlined,
  localization: TranslationOutlined,
  media: PictureOutlined,
  observability: MonitorOutlined,
  revisions: HistoryOutlined,
  runtime: ApiOutlined,
  support: CustomerServiceOutlined,
  "user-management": TeamOutlined,
  brand: SkinOutlined,
  theme: SkinOutlined,
} as const;

export function PhiWidgetIcon({ family, size = 16 }: PhiWidgetIconProps) {
  const Icon = WIDGET_ICON_REGISTRY[family as keyof typeof WIDGET_ICON_REGISTRY];
  return Icon ? <Icon style={{ fontSize: size }} /> : null;
}
