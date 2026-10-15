import { describe, expect, it } from "vitest";

import { PHI_COMMAND_TOOLBAR_BUTTON_BOUNDS, PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION } from "./config";
import {
  createPhiCommandButton,
  resizePhiCommandButtons,
} from "../../../../../components/widgets/config/command-buttons";

const resize = (buttons: Parameters<typeof resizePhiCommandButtons>[0], count: number) =>
  resizePhiCommandButtons(buttons, count, PHI_COMMAND_TOOLBAR_BUTTON_BOUNDS);

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
    const next = resize([first], 3);
    expect(next[0]).toBe(first);
    expect(next.map((button) => button.key)).toEqual(["save", "button2", "button3"]);
  });

  it("drops the last when the count goes down, and never below one", () => {
    const buttons = resize([], 3);
    expect(resize(buttons, 2).map((button) => button.key)).toEqual(["button1", "button2"]);
    expect(resize(buttons, 0).map((button) => button.key)).toEqual(["button1"]);
  });

  it("names a new button after the first free key", () => {
    expect(createPhiCommandButton([
      { key: "button2", label: "B", emits: [] },
    ]).key).toBe("button3");
  });
});
