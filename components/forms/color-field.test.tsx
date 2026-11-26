// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PhiFormDescriptor } from "../../types/form-descriptor";
import { PhiFormControl } from "../controls/phi-form-control";
import { PhiConfigProvider } from "../root/phi-config-provider";
import { PhiIntlLocaleProvider } from "../root/phi-intl-locale";
import { resolvePhiRootThemeState } from "../root/phi-root-theme-resolver";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { readPhiColorFieldValue } from "./color-field";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "./form-provider-contract";

/*
 * The `color` field (FORMS.md): the Inspector's colour field in a Form, holding what that field holds --
 * a CSS colour, or the Theme role a Theme swatch stores -- and `null` for none.
 */

describe("a color field's value", () => {
  it("is a CSS colour or a Theme role, null for none", () => {
    expect(readPhiColorFieldValue("#1677ff")).toBe("#1677ff");
    expect(readPhiColorFieldValue(" #1677FFCC ")).toBe("#1677FFCC");
    expect(readPhiColorFieldValue("rgba(22, 119, 255, 0.5)")).toBe("rgba(22, 119, 255, 0.5)");
    expect(readPhiColorFieldValue("var(--phi-color-primary)")).toBe("var(--phi-color-primary)");
    expect(readPhiColorFieldValue("var(--phi-custom-3)")).toBe("var(--phi-custom-3)");
    expect(readPhiColorFieldValue(null)).toBeNull();
    expect(readPhiColorFieldValue(undefined)).toBeNull();
    expect(readPhiColorFieldValue("  ")).toBeNull();
  });

  it("is read strictly: anything else is no value this field writes", () => {
    for (const value of [3, true, { r: 0 }, ["#fff"], "red", "linear-gradient(#fff, #000)", "var(--other)", "#12"]) {
      expect(() => readPhiColorFieldValue(value), JSON.stringify(value)).toThrow(/color field/u);
    }
  });
});

const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const themeState = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });

const DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: "colour",
  fields: [{
    key: "accent",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.color,
    label: { kind: "literal", value: "Accent" },
    config: { allowClear: true },
  }],
};

function mount(initialValues: Record<string, unknown>) {
  const onValuesChange = vi.fn();
  const view = render(
    <PhiConfigProvider
      locale={undefined}
      fonts={{}}
      fontFamilies={[]}
      mode="light"
      theme={themeState.themes.light}
      presets={PHI_CORE_THEME_PRESET_PLUGINS}
      customColors={resolvePhiPublishedThemeCustomColors(siteTheme, "light", PHI_CORE_THEME_PRESET_PLUGINS)}
      rootClassName=""
      rootStyle={{}}
      controlShape="rounded"
    >
      <PhiIntlLocaleProvider locale="en" timeZone="UTC" renderedAt={0}>
        <PhiFormControl
          descriptor={DESCRIPTOR}
          size="small"
          initialValues={initialValues}
          submitOnEnter={false}
          onSubmit={() => undefined}
          onValuesChange={onValuesChange}
        />
      </PhiIntlLocaleProvider>
    </PhiConfigProvider>,
  );
  const open = async () => {
    const swatch = await waitFor(() => {
      const trigger = view.container.querySelector<HTMLElement>(".ant-color-picker-trigger");
      expect(trigger).not.toBeNull();
      return trigger!;
    });
    await act(async () => { fireEvent.click(swatch); });
    return waitFor(() => {
      const panel = document.querySelector<HTMLElement>(".phi-color-widget-panel");
      expect(panel).not.toBeNull();
      return panel!;
    });
  };
  return { view, onValuesChange, open };
}

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe("a color field in a Form", () => {
  it("draws the Inspector's colour swatch in the Form's size, labelled by the field", async () => {
    const { view } = mount({ accent: "#ff0000" });
    const trigger = await waitFor(() => {
      const element = view.container.querySelector<HTMLElement>(".ant-color-picker-trigger");
      expect(element).not.toBeNull();
      return element!;
    });
    expect(trigger.classList.contains("ant-color-picker-sm")).toBe(true);
    expect(view.container.querySelector("[aria-label='Accent']")).not.toBeNull();
  });

  it("stores the Theme role of a Theme swatch, as the Inspector's colour field does", async () => {
    const { open, onValuesChange } = mount({ accent: "#ff0000" });
    const panel = await open();
    const swatch = panel.querySelector<HTMLButtonElement>("button[aria-pressed]");
    expect(swatch).not.toBeNull();
    await act(async () => { fireEvent.click(swatch!); });
    await waitFor(() => expect(onValuesChange).toHaveBeenCalled());
    expect(onValuesChange.mock.calls.at(-1)![0]).toEqual({ accent: expect.stringMatching(/^var\(--phi-[a-z0-9-]+\)$/u) });
  });

  it("is emptied to null where it may be cleared", async () => {
    const { open, onValuesChange } = mount({ accent: "#ff0000" });
    await open();
    const clear = await waitFor(() => {
      const element = document.querySelector<HTMLElement>(".ant-color-picker-clear");
      expect(element).not.toBeNull();
      return element!;
    });
    await act(async () => { fireEvent.click(clear); });
    await waitFor(() => expect(onValuesChange).toHaveBeenCalledWith({ accent: null }, expect.anything()));
  });
});
