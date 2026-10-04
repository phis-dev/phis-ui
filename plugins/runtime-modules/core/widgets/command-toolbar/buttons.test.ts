import { describe, expect, it } from "vitest";

import {
  PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION,
  createPhiCommandToolbarButton,
  resizePhiCommandToolbarButtons,
} from "./config";

/*
 * A Command Toolbar is counted from its scaffold, as a Description's items are, and never drops below one
 * button: a toolbar without buttons draws nothing, and an author has nothing to select it by.
 */
describe("a Command Toolbar's buttons", () => {
  it("starts with one", () => {
    expect(PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION.defaultConfig.buttons).toEqual([
      { key: "button1", label: "Button 1", icon: "antd:star-outlined", emits: [{ capabilityId: "command", value: "button1" }] },
    ]);
  });

  it("keeps the buttons it has and creates the rest after them", () => {
    const first = { key: "save", label: "Save", emits: [{ capabilityId: "command", value: "save" }] };
    const next = resizePhiCommandToolbarButtons([first], 3);
    expect(next[0]).toBe(first);
    expect(next.map((button) => button.key)).toEqual(["save", "button2", "button3"]);
  });

  it("drops the last when the count goes down, and never below one", () => {
    const buttons = resizePhiCommandToolbarButtons([], 3);
    expect(resizePhiCommandToolbarButtons(buttons, 2).map((button) => button.key)).toEqual(["button1", "button2"]);
    expect(resizePhiCommandToolbarButtons(buttons, 0).map((button) => button.key)).toEqual(["button1"]);
  });

  it("names a new button after the first free key", () => {
    expect(createPhiCommandToolbarButton([
      { key: "button2", label: "B", emits: [] },
    ]).key).toBe("button3");
  });
});
