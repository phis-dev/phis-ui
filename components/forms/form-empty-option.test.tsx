// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PhiFormDescriptor } from "@phis/contracts/forms";

import { PhiFormControl, type PhiFormControlHandle } from "../controls/phi-form-control";
import { PhiConfigProvider } from "../root/phi-config-provider";
import { PhiIntlLocaleProvider } from "../root/phi-intl-locale";
import { resolvePhiRootThemeState } from "../root/phi-root-theme-resolver";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "./form-provider-contract";
import { omitPhiFormEmptyOptionFields } from "./form-empty-option";

/*
 * A select field's "none of these" (FORMS.md, "The empty option"): drawn last, after a line; the field
 * opens on it where it holds nothing; chosen, it leaves the field with no value, and the submit leaves
 * the field out.
 */
const DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: "message",
  fields: [
    { key: "message", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text, label: { kind: "literal", value: "Message" } },
    {
      key: "sourceLang",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: { kind: "literal", value: "Written in" },
      options: [
        { value: "de", label: { kind: "literal", value: "Deutsch" } },
        { value: "en", label: { kind: "literal", value: "English" } },
      ],
      emptyOption: { label: { kind: "label", key: "other", fallback: "Other language" } },
    },
  ],
};

const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const themeState = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });

function mount(initialValues: Record<string, unknown>) {
  const onSubmit = vi.fn();
  const ref = createRef<PhiFormControlHandle>();
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
          ref={ref}
          descriptor={DESCRIPTOR}
          labels={{ other: "Andere Sprache" }}
          initialValues={initialValues}
          submitOnEnter={false}
          onSubmit={onSubmit}
        />
      </PhiIntlLocaleProvider>
    </PhiConfigProvider>,
  );
  const select = () => view.container.querySelector(".ant-select") as HTMLElement;
  const shown = () => select().querySelector(".ant-select-content")?.textContent ?? null;
  const submit = async () => {
    await act(async () => { ref.current!.submit(); });
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    return onSubmit.mock.calls.at(-1)![0] as Record<string, unknown>;
  };
  return { select, shown, submit };
}

afterEach(cleanup);

describe("a select field's empty option", () => {
  it("is what the field opens on where it holds nothing, in the Form's own words, and submits no value", async () => {
    const form = mount({ message: "Hallo" });
    await waitFor(() => expect(form.select()).not.toBeNull());
    expect(form.shown()).toBe("Andere Sprache");
    expect(await form.submit()).toEqual({ message: "Hallo" });
  });

  it("is listed last, after a line, and choosing it leaves the field out of the submit", async () => {
    const form = mount({ message: "Hallo", sourceLang: "de" });
    await waitFor(() => expect(form.select()).not.toBeNull());
    expect(form.shown()).toBe("Deutsch");
    await act(async () => {
      fireEvent.mouseDown(form.select().querySelector(".ant-select-content")!);
    });
    const menu = await waitFor(() => {
      const list = document.querySelector(".ant-select-dropdown") as HTMLElement | null;
      expect(list?.textContent).toContain("Andere Sprache");
      return list!;
    });
    const entries = [...menu.querySelectorAll(".ant-select-item-option")];
    expect(entries.map((entry) => entry.textContent)).toEqual(["Deutsch", "English", "", "Andere Sprache"]);
    expect(entries[2]!.querySelector("[role=separator]")).not.toBeNull();
    await act(async () => { fireEvent.click(screen.getByText("Andere Sprache", { selector: ".ant-select-item-option *" })); });
    await waitFor(() => expect(form.shown()).toBe("Andere Sprache"));
    expect(await form.submit()).toEqual({ message: "Hallo" });
  });

  it("submits a language chosen in its place", async () => {
    const form = mount({ message: "Hallo" });
    await waitFor(() => expect(form.select()).not.toBeNull());
    await act(async () => {
      fireEvent.mouseDown(form.select().querySelector(".ant-select-content")!);
    });
    await waitFor(() => expect(document.querySelector(".ant-select-dropdown")?.textContent).toContain("English"));
    await act(async () => { fireEvent.click(screen.getByText("English", { selector: ".ant-select-item-option *" })); });
    expect(await form.submit()).toEqual({ message: "Hallo", sourceLang: "en" });
  });
});

describe("what a submit sends", () => {
  const fields = [{ key: "sourceLang", emptyOption: { label: { kind: "literal" as const, value: "None" } } }, { key: "note" }];

  it("leaves out a field that holds its empty option, and nothing else", () => {
    expect(omitPhiFormEmptyOptionFields(fields, { sourceLang: undefined, note: "" })).toEqual({ note: "" });
    expect(omitPhiFormEmptyOptionFields(fields, { sourceLang: null, note: null })).toEqual({ note: null });
    expect(omitPhiFormEmptyOptionFields(fields, { sourceLang: "", note: undefined })).toEqual({ note: undefined });
    expect(omitPhiFormEmptyOptionFields(fields, { sourceLang: "de" })).toEqual({ sourceLang: "de" });
  });
});
