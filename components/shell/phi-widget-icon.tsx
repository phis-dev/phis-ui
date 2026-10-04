"use client";

import { PhiIcon } from "./phi-icon";

type PhiWidgetIconProps = {
  family: string;
  size?: number | string;
};

const WIDGET_ICON_REGISTRY = {
  layout: "layout",
  content: "appstore",
  basic: "file",
  navigation: "menu",
  form: "form",
  forms: "form",
  commerce: "shopping",
  auth: "user",
  admin: "setting",
  builder: "branches",
  dashboard: "dashboard",
  developer: "code",
  editor: "edit",
  groups: "cluster",
  internal: "branches",
  localization: "translation",
  media: "picture",
  observability: "monitor",
  revisions: "history",
  runtime: "api",
  support: "customer-service",
  threads: "message",
  "user-management": "team",
  brand: "skin",
  theme: "skin",
} as const;

export function PhiWidgetIcon({ family, size = 16 }: PhiWidgetIconProps) {
  const name = WIDGET_ICON_REGISTRY[family as keyof typeof WIDGET_ICON_REGISTRY];
  return name ? <PhiIcon name={name} size={size} /> : null;
}
