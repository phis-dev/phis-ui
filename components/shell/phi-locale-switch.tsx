"use client";

import { DownOutlined } from "@ant-design/icons";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Space, Typography } from "antd";

import { isKnownSpecialCmsRoot } from "../../helpers/cms-routing";
import { localizeAreaPath, stripLocaleAndAreaFromPathname } from "../../helpers/locale";
import {
  PHI_PILL_TRIGGER_CLASS_NAME,
  PhiDropdownControl,
} from "../controls/phi-dropdown-control";
import type { PhiMenuControlItem } from "../controls/phi-menu-control";

export type PhiLocaleOption = {
  code: string;
  label: string;
};

export type PhiLocaleSwitchProps = {
  currentLocale: string;
  localeOptions: PhiLocaleOption[];
  mode?: "label-list" | "compact-pill";
  showText?: boolean;
  interactive?: boolean;
};

export function PhiLocaleSwitch({
  currentLocale,
  localeOptions,
  mode = "label-list",
  showText = true,
  interactive = true,
}: PhiLocaleSwitchProps) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const currentQuery = searchParams?.toString();
  const pathSegments = pathname.split("/").filter(Boolean);
  const areaCandidate = pathSegments[0]?.toLowerCase() ?? "";
  const normalizedCurrentPath = stripLocaleAndAreaFromPathname(pathname);
  const areaSegment = isKnownSpecialCmsRoot(areaCandidate) ? areaCandidate : "public";
  const currentPathWithQuery = `${normalizedCurrentPath === "/" ? "/" : normalizedCurrentPath}${currentQuery ? `?${currentQuery}` : ""}`;
  const currentOption =
    localeOptions.find((localeOption) => localeOption.code === currentLocale) ??
    localeOptions.find(Boolean) ??
    null;
  /**
   * The active locale stays in the list and renders disabled, so the menu shows the full set the
   * Site offers and the trigger never names an entry the list omits. A Site with a single locale
   * has nothing to switch to and therefore presents no menu at all.
   */
  const hasAlternativeLocale = localeOptions.filter((localeOption) => localeOption.code).length > 1;
  const items: PhiMenuControlItem[] = hasAlternativeLocale
    ? localeOptions
      .filter((localeOption) => localeOption.code)
      .map((localeOption) => ({
        key: localeOption.code,
        disabled: localeOption.code === currentLocale,
        label: localeOption.code === currentLocale ? (
          <span>{localeOption.label}</span>
        ) : (
          <Link href={localizeAreaPath(localeOption.code, areaSegment, currentPathWithQuery)}>
            {localeOption.label}
          </Link>
        ),
      }))
    : [];

  if (!currentOption) {
    return null;
  }

  const compactPill = mode === "compact-pill";
  const currentLabel = showText
    ? currentOption.label
    : currentOption.code.trim().toUpperCase();

  function handleTriggerClick(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
  }

  return (
    <PhiDropdownControl
      items={interactive ? items : []}
      selectedKeys={[currentLocale]}
    >
      <Typography.Link
        className={compactPill ? PHI_PILL_TRIGGER_CLASS_NAME : undefined}
        onClick={interactive ? handleTriggerClick : undefined}
        style={
          compactPill
            ? undefined
            : { fontSize: "inherit", color: "inherit", textDecoration: "none" }
        }
      >
        <Space size={5}>
          <span>{compactPill ? currentOption.code.trim().toUpperCase() : currentLabel}</span>
          {interactive && items.length > 0 ? <DownOutlined style={{ fontSize: 12 }} /> : null}
        </Space>
      </Typography.Link>
    </PhiDropdownControl>
  );
}
