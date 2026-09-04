"use client";

import { DownOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import { useRef, useState, type MouseEvent } from "react";

import type { PhiClientBlockBaseProps, PhiBlockRuntime, PhiNoLabels } from "../../../../../types";
import {
  PHI_PILL_TRIGGER_CLASS_NAME,
  PhiDropdownControl,
} from "../../../../../components/controls/phi-dropdown-control";
import type { PhiMenuControlItem } from "../../../../../components/controls/phi-menu-control";
import { PhiNavLink } from "../../../../../components/shell/phi-nav-link";

const PHI_ICON_SIZE = "0.75rem";

export type PhiAreaMenuItem = {
  key: PhiBlockRuntime["area"];
  label: string;
  href: string;
  disabled?: boolean;
};

export type PhiAreaMenuWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  Record<string, never>,
  Pick<PhiBlockRuntime, "area" | "locale">
> & {
  items: PhiAreaMenuItem[];
};

export function PhiAreaMenuWidgetClient({
  runtime,
  items,
}: PhiAreaMenuWidgetClientProps) {
  const currentArea = runtime?.area ?? "public";
  const currentItem = items.find((item) => item.key === currentArea) ?? items[0];

  /*
   * Each entry should link to where its Area root would send this viewer, not to the root itself: a
   * client navigation onto a forwarding root races the streamed forward against the Area switch's
   * lazy shell refetches -- measured at dozens of round trips -- while a link that already names the
   * destination costs one settled navigation.
   *
   * Only the navigation-target route can answer this, because each Area's bundle deliberately
   * carries only its own Module catalog. The answers are fetched once, when the trigger is first
   * touched -- hover and focus both precede a click by enough for a local round trip -- rather than
   * on mount, so a page that never opens the menu never asks. Until an answer arrives the entry
   * keeps the root href, which still works: the root forwards.
   */
  const [destinations, setDestinations] = useState<Partial<Record<string, string>>>({});
  const requestedDestinations = useRef(false);

  function resolveDestinations() {
    if (requestedDestinations.current) {
      return;
    }
    requestedDestinations.current = true;
    for (const item of items) {
      if (item.disabled || item.key === currentArea) {
        continue;
      }
      void (async () => {
        try {
          const search = new URLSearchParams({ area: item.key, path: item.href });
          const response = await fetch(`/api/site/navigation-target?${search.toString()}`, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          });
          const payload = await response.json().catch(() => null) as
            | { destinationHref?: unknown }
            | null;
          if (response.ok && typeof payload?.destinationHref === "string") {
            const destinationHref = payload.destinationHref;
            setDestinations((current) => ({ ...current, [item.key]: destinationHref }));
          }
        } catch {
          // The root href stays in place and forwards; the menu never breaks over this.
        }
      })();
    }
  }

  if (!currentItem || items.length === 0) {
    return null;
  }

  const menuItems: PhiMenuControlItem[] = items.map((item) => ({
    key: item.key,
    disabled: item.disabled || item.key === currentArea,
    label: item.disabled || item.key === currentArea ? (
      <span>{item.label}</span>
    ) : (
      <PhiNavLink href={destinations[item.key] ?? item.href} style={{ textDecoration: "none" }}>
        {item.label}
      </PhiNavLink>
    ),
  }));

  function handleTriggerClick(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    resolveDestinations();
  }

  return (
    <PhiDropdownControl items={menuItems} selectedKeys={[currentArea]}>
      <Typography.Link
        className={PHI_PILL_TRIGGER_CLASS_NAME}
        onClick={handleTriggerClick}
        onMouseEnter={resolveDestinations}
        onFocus={resolveDestinations}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--ant-padding-xs)",
          }}
        >
          <span>{currentItem.label}</span>
          <DownOutlined style={{ fontSize: PHI_ICON_SIZE }} />
        </span>
      </Typography.Link>
    </PhiDropdownControl>
  );
}
