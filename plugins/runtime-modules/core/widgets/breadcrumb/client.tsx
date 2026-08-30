"use client";

import { Breadcrumb, Flex } from "antd";
import { usePathname } from "next/navigation";

import type { PhiClientBlockBaseProps, PhiBlockRuntime, PhiNoLabels } from "../../../../../types";
import type { PhiCmsBreadcrumbWidgetConfig } from "./config";

export type { PhiCmsBreadcrumbWidgetConfig as PhiBreadcrumbWidgetConfig } from "./config";

export type PhiBreadcrumbWidgetLabels = PhiNoLabels;

export type PhiBreadcrumbWidgetProps = PhiClientBlockBaseProps<
  PhiBreadcrumbWidgetLabels,
  PhiCmsBreadcrumbWidgetConfig,
  Pick<PhiBlockRuntime, "site" | "area" | "locale">
>;

export function PhiBreadcrumbWidget({ config, runtime }: PhiBreadcrumbWidgetProps) {
  const pathname = usePathname();
  const breadcrumbItems = [
    { title: config?.rootLabel?.trim() || runtime?.site.name?.trim() || runtime?.site.key || "Site" },
    config?.showArea === false ? null : { title: runtime?.area ?? "area" },
    config?.showPath === false ? null : { title: config?.pathLabel?.trim() || pathname || "/" },
  ].filter(Boolean) as Array<{ title: string }>;

  return (
    <Flex align={config?.align ?? "center"} justify={config?.justify ?? "flex-start"} gap={12} wrap="wrap">
      <Breadcrumb items={breadcrumbItems} separator={config?.separator} />
    </Flex>
  );
}
