"use client";

import {
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  CodeOutlined,
  ColumnWidthOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MenuOutlined,
  NotificationOutlined,
  PictureOutlined,
  ProfileOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  SkinOutlined,
  TableOutlined,
  TeamOutlined,
  TranslationOutlined,
} from "@ant-design/icons";

const PHI_MANAGEMENT_ICON_REGISTRY = {
  apartment: ApartmentOutlined,
  "apartment-outlined": ApartmentOutlined,
  api: ApiOutlined,
  "api-outlined": ApiOutlined,
  appstore: AppstoreOutlined,
  "appstore-outlined": AppstoreOutlined,
  branches: BranchesOutlined,
  "branches-outlined": BranchesOutlined,
  code: CodeOutlined,
  "code-outlined": CodeOutlined,
  "column-width": ColumnWidthOutlined,
  "column-width-outlined": ColumnWidthOutlined,
  "customer-service": CustomerServiceOutlined,
  "customer-service-outlined": CustomerServiceOutlined,
  dashboard: DashboardOutlined,
  "dashboard-outlined": DashboardOutlined,
  delete: DeleteOutlined,
  "delete-outlined": DeleteOutlined,
  download: DownloadOutlined,
  "download-outlined": DownloadOutlined,
  experiment: ExperimentOutlined,
  "experiment-outlined": ExperimentOutlined,
  file: FileTextOutlined,
  "file-text": FileTextOutlined,
  "file-search": FileTextOutlined,
  "file-text-outlined": FileTextOutlined,
  history: HistoryOutlined,
  "history-outlined": HistoryOutlined,
  menu: MenuOutlined,
  "menu-outlined": MenuOutlined,
  notification: NotificationOutlined,
  "notification-outlined": NotificationOutlined,
  picture: PictureOutlined,
  "picture-outlined": PictureOutlined,
  profile: ProfileOutlined,
  "profile-outlined": ProfileOutlined,
  read: ReadOutlined,
  "read-outlined": ReadOutlined,
  "safety-certificate": SafetyCertificateOutlined,
  "safety-certificate-outlined": SafetyCertificateOutlined,
  setting: SettingOutlined,
  "setting-outlined": SettingOutlined,
  skin: SkinOutlined,
  "skin-outlined": SkinOutlined,
  table: TableOutlined,
  "table-outlined": TableOutlined,
  team: TeamOutlined,
  "team-outlined": TeamOutlined,
  translation: TranslationOutlined,
  "translation-outlined": TranslationOutlined,
} as const;

export function PhiManagementIcon({
  name,
  size,
}: {
  name: string;
  size: number | string;
}) {
  const Icon =
    PHI_MANAGEMENT_ICON_REGISTRY[
      name as keyof typeof PHI_MANAGEMENT_ICON_REGISTRY
    ];
  return Icon ? <Icon style={{ fontSize: size }} /> : null;
}
