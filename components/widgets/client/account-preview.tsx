"use client";

import type { PhiMenuControlItem } from "../../controls/phi-menu-control";
import { PhiAvatar } from "../../shell/phi-avatar";

export function PhiAccountWidgetPreview() {
  const menuItems: PhiMenuControlItem[] = [
    {
      key: "profile",
      label: "Profile",
    },
    {
      key: "settings",
      label: "Settings",
    },
  ];

  return (
    <div>
      <PhiAvatar label="Taylor" menuItems={menuItems} showLabel showChevron={false} />
    </div>
  );
}
