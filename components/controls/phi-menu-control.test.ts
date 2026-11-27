import { describe, expect, it } from "vitest";

import { resolvePhiMenuOpenKeys, type PhiMenuControlItem } from "./phi-menu-control";

const SIDEBAR: PhiMenuControlItem[] = [
  { key: "dashboard", label: "Dashboard" },
  {
    key: "billing",
    label: "Billing",
    children: [
      { key: "documents", label: "Documents" },
      { key: "series", label: "Number series" },
    ],
  },
  { type: "divider" },
  {
    key: "settings",
    label: "Settings",
    children: [
      { key: "profile", label: "Profile" },
      { key: "advanced", label: "Advanced", children: [{ key: "keys", label: "Keys" }] },
    ],
  },
  { type: "group", key: "areas", label: "Areas", children: [{ key: "admin", label: "Admin" }] },
];

describe("the submenus an inline menu opens on", () => {
  it("are the containers of the active entry, at every depth", () => {
    expect(resolvePhiMenuOpenKeys(SIDEBAR, ["series"])).toEqual(["billing"]);
    expect(resolvePhiMenuOpenKeys(SIDEBAR, ["keys"])).toEqual(["advanced", "settings"]);
  });

  it("are none for a top-level entry, an entry inside a group, or nothing selected", () => {
    expect(resolvePhiMenuOpenKeys(SIDEBAR, ["dashboard"])).toEqual([]);
    expect(resolvePhiMenuOpenKeys(SIDEBAR, ["admin"])).toEqual([]);
    expect(resolvePhiMenuOpenKeys(SIDEBAR, [])).toEqual([]);
  });
});
