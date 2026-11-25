import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PHI_GREGORY_CALENDAR_ADAPTER_CLIENT } from "../calendar/gregory-calendar-adapter-client";
import { PhiCascaderControl, PhiTreeCascaderControl } from "./phi-cascader-control";
import { PhiCheckboxGroupControl } from "./phi-checkbox-group-control";
import { PhiColorControl } from "./phi-color-control";
import { PhiColorFieldControl } from "./phi-color-field-control";
import { PhiDatePickerControl } from "./phi-date-picker-control";
import { PhiDimensionControl } from "./phi-dimension-control";
import { PhiLengthControl } from "./phi-length-control";
import { PhiSegmentedControl } from "./phi-segmented-control";
import { PhiSwitchControl } from "./phi-switch-control";

vi.mock("../root/phi-config-provider", () => ({
  usePhiConfig: () => ({ token: { paddingXS: 8, paddingXXS: 4, fontSizeSM: 11 } }),
}));

vi.mock("./use-phi-color-control-presets", () => ({
  usePhiColorControlPresets: () => [],
}));

vi.mock("../runtime/runtime-module-calendar-adapter-client-manifest", async () => {
  const { PHI_GREGORY_CALENDAR_ADAPTER_CLIENT: adapter } = await import("../calendar/gregory-calendar-adapter-client");
  return { usePhiCalendarAdapterClient: () => adapter };
});

function render(element: ReactElement) {
  return renderToStaticMarkup(element);
}

/** The opening tag of the first element that carries the attribute, so it can be told where it stands. */
function tagWith(markup: string, attribute: string) {
  return new RegExp(`<[a-z]+[^>]*\\s${attribute}="[^"]*"[^>]*>`, "u").exec(markup)?.[0] ?? null;
}

/*
 * A Control with no visible label beside it -- a filter in a picker's header, a switch in a toolbar -- is
 * named by `ariaLabel`, which wins over `label`; with it, nothing points at a label element. A group --
 * a segmented switch, a checkbox group, a width and height pair -- is named on the group, not on one of
 * the fields inside it.
 */
describe("PhiSegmentedControl", () => {
  const options = [{ value: "layout", label: "Layouts" }, { value: "widget", label: "Widgets" }];

  it("names the radio group with ariaLabel", () => {
    const markup = render(createElement(PhiSegmentedControl<string>, {
      ariaLabel: "Insert a layout or a widget", options, value: "layout", onChange: () => {},
    }));
    const tag = tagWith(markup, "aria-label");
    expect(tag).toContain('aria-label="Insert a layout or a widget"');
    expect(tag).toContain("ant-segmented");
    expect(markup).not.toContain("aria-labelledby");
  });

  it("prefers ariaLabel over label", () => {
    const markup = render(createElement(PhiSegmentedControl<string>, {
      label: "Section", ariaLabel: "Insert a layout or a widget", options, value: "layout", onChange: () => {},
    }));
    expect(markup).toContain('aria-label="Insert a layout or a widget"');
    expect(markup).not.toContain("aria-labelledby");
  });
});

describe("PhiCascaderControl", () => {
  it("names the field with ariaLabel, over label", () => {
    const markup = render(createElement(PhiCascaderControl, {
      label: "Folder", ariaLabel: "Target folder", options: [], value: "/", onChange: () => {},
    }));
    expect(markup).toContain('aria-label="Target folder"');
    expect(markup).not.toContain("aria-labelledby");
  });

  it("is named by its label otherwise", () => {
    const markup = render(createElement(PhiCascaderControl, { label: "Folder", options: [], value: "/", onChange: () => {} }));
    expect(markup).toContain("aria-labelledby");
  });
});

describe("PhiTreeCascaderControl", () => {
  const options = [{ value: "home", label: "Home" }];

  it("names the field with ariaLabel, over label", () => {
    const markup = render(createElement(PhiTreeCascaderControl, {
      label: "Pages", ariaLabel: "Pages to show", options, value: [], onChange: () => {},
    }));
    expect(markup).toContain('aria-label="Pages to show"');
    expect(markup).not.toContain("aria-labelledby");
  });

  it("is named by its visible label otherwise", () => {
    const markup = render(createElement(PhiTreeCascaderControl, { label: "Pages", options, value: [], onChange: () => {} }));
    expect(markup).toContain(">Pages<");
    expect(markup).toContain("aria-labelledby");
  });
});

describe("PhiDatePickerControl", () => {
  const props = {
    adapterKey: PHI_GREGORY_CALENDAR_ADAPTER_CLIENT.key,
    selection: { mode: "single" as const, value: null },
    selectionMode: "single" as const,
    precision: "date" as const,
    timeZone: "UTC",
    onChange: () => {},
  };

  it("points its input at its visible label", () => {
    const markup = render(createElement(PhiDatePickerControl, { ...props, label: "Due" }));
    expect(tagWith(markup, "aria-labelledby")).toMatch(/^<input/u);
  });

  it("names its input with ariaLabel, over label", () => {
    const markup = render(createElement(PhiDatePickerControl, { ...props, label: "Due", ariaLabel: "Due date" }));
    const tag = tagWith(markup, "aria-label");
    expect(tag).toMatch(/^<input/u);
    expect(tag).toContain('aria-label="Due date"');
    expect(markup).not.toContain("aria-labelledby");
  });
});

describe("PhiColorControl", () => {
  it("names its swatch with ariaLabel", () => {
    const markup = render(createElement(PhiColorControl, { ariaLabel: "Text colour", value: "#ff0000", onChange: () => {} }));
    expect(tagWith(markup, "aria-label")).toContain("ant-color-picker-trigger");
    expect(markup).toContain('aria-label="Text colour"');
  });
});

describe("PhiColorFieldControl", () => {
  it("names its swatch by its label", () => {
    const markup = render(createElement(PhiColorFieldControl, { label: "Text", value: "#ff0000" }));
    expect(markup).toContain('aria-label="Text"');
  });

  it("prefers ariaLabel over label", () => {
    const markup = render(createElement(PhiColorFieldControl, { label: "Text", ariaLabel: "Text colour", value: "#ff0000" }));
    expect(markup).toContain('aria-label="Text colour"');
    expect(markup).not.toContain('aria-label="Text"');
  });
});

describe("PhiLengthControl", () => {
  it("names the number and its unit after ariaLabel, over placeholder and label", () => {
    const markup = render(createElement(PhiLengthControl, {
      label: "Gap", placeholder: "16", ariaLabel: "Column gap", value: "16px", onChange: () => {},
    }));
    expect(markup).toContain('aria-label="Column gap"');
    expect(markup).toContain('aria-label="Column gap unit"');
    expect(markup).not.toContain('aria-label="16"');
  });
});

describe("PhiCheckboxGroupControl", () => {
  it("names the group, not a checkbox", () => {
    const markup = render(createElement(PhiCheckboxGroupControl<string>, {
      ariaLabel: "Channels",
      options: [{ value: "mail", label: "Mail" }, { value: "sms", label: "SMS" }],
      value: [],
      onChange: () => {},
    }));
    const tag = tagWith(markup, "aria-label");
    expect(tag).toContain('role="group"');
    expect(tag).toContain('aria-label="Channels"');
  });
});

describe("PhiDimensionControl", () => {
  it("names the pair as a group, and each field keeps its own name", () => {
    const markup = render(createElement(PhiDimensionControl, { ariaLabel: "Size", onChange: () => {} }));
    const tag = tagWith(markup, "aria-label");
    expect(tag).toContain('role="group"');
    expect(tag).toContain('aria-label="Size"');
    expect(markup).toContain('aria-label="Width"');
    expect(markup).toContain('aria-label="Height"');
  });
});

describe("PhiSwitchControl", () => {
  it("names the switch with ariaLabel, over label", () => {
    const markup = render(createElement(PhiSwitchControl, {
      label: "Grid", ariaLabel: "Show the grid", checked: false, onChange: () => {},
    }));
    const tag = tagWith(markup, "aria-label");
    expect(tag).toContain('role="switch"');
    expect(tag).toContain('aria-label="Show the grid"');
    expect(markup).not.toContain("aria-labelledby");
  });

  it("is named by its label otherwise", () => {
    const markup = render(createElement(PhiSwitchControl, { label: "Grid", checked: false, onChange: () => {} }));
    expect(tagWith(markup, "aria-labelledby")).toContain('role="switch"');
  });
});
