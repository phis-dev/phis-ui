// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PhiFormDescriptor, PhiFormFieldDescriptor } from "@phis/contracts/forms";

import { PhiFormControl, type PhiFormControlHandle } from "../controls/phi-form-control";
import { PhiConfigProvider } from "../root/phi-config-provider";
import { PhiIntlLocaleProvider } from "../root/phi-intl-locale";
import { resolvePhiRootThemeState } from "../root/phi-root-theme-resolver";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PHI_FORM_FIELD_PROVIDER_KEYS, PHI_FORM_VALIDATION_PROVIDER_KEYS } from "./form-provider-contract";
import { checkPhiFormDescriptorFields } from "./form-descriptor-field-check";
import { listPhiFormFieldsDeep } from "./form-field-walk";
import {
  buildPhiFormListEntryDescriptor,
  isPhiFormListKeyTaken,
  mergePhiFormListEntry,
  readPhiFormListFieldConfig,
} from "./list-field";

const literal = (value: string) => ({ kind: "literal" as const, value });

/* A listing's plans, as the Shop's listing Form holds them: each a title, a key and how it is sold. */
const ENTRY_FIELDS: PhiFormFieldDescriptor[] = [
  {
    key: "title",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
    label: literal("Title"),
    validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: literal("A title is required.") }],
  },
  { key: "key", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text, label: literal("Key") },
  {
    key: "billing",
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
    label: literal("Sold as"),
    options: [
      { value: "one_time", label: { kind: "label", key: "oneTime", fallback: "One-time" } },
      { value: "subscription", label: literal("Subscription") },
    ],
  },
];

const PLANS: PhiFormFieldDescriptor = {
  key: "plans",
  fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.list,
  label: literal("Plans"),
  fields: ENTRY_FIELDS,
  config: {
    columns: [{ field: "title" }, { field: "key", renderer: "code" }, { field: "billing" }],
    itemKeyField: "key",
    itemLabelField: "title",
    removeDisabledWhen: { source: "row", valuePath: "inUse", operator: "truthy" },
    removeDisabledReason: literal("Named by a subscription: retire it instead."),
  },
};

const DESCRIPTOR: PhiFormDescriptor = { schemaVersion: 1, key: "listing", fields: [PLANS] };

describe("the list field's config", () => {
  it("is read strictly, and a column draws its field by what the field holds", () => {
    const config = readPhiFormListFieldConfig(PLANS);
    expect(config.columns.map((column) => [column.field.key, column.renderer])).toEqual([
      ["title", "text"], ["key", "code"], ["billing", "text"],
    ]);
    expect(config).toMatchObject({ minItems: 0, reorderable: false, itemKeyField: "key", itemLabelField: "title" });
    expect(() => readPhiFormListFieldConfig({ ...PLANS, fields: [] })).toThrow(/no entry fields/u);
    expect(() => readPhiFormListFieldConfig({ ...PLANS, config: { columns: [{ field: "price" }] } })).toThrow(/must name one of the entry fields/u);
    expect(() => readPhiFormListFieldConfig({ ...PLANS, config: { columns: [{ field: "title" }], addLabel: "Add plan" } })).toThrow(/Form text/u);
    expect(() => readPhiFormListFieldConfig({ ...PLANS, config: { columns: [{ field: "title" }], removeDisabledReason: literal("x") } }))
      .toThrow(/together or neither/u);
    expect(() => readPhiFormListFieldConfig({ ...PLANS, config: { columns: [{ field: "title" }], minItems: 2, maxItems: 1 } })).toThrow(/fewer entries/u);
    expect(() => readPhiFormListFieldConfig({ ...PLANS, config: { columns: [{ field: "title" }], rows: [] } })).toThrow(/does not read/u);
  });

  it("is checked where the Form is made, with the entry fields as a level of their own", () => {
    expect(checkPhiFormDescriptorFields(DESCRIPTOR)).toEqual([]);
    const broken: PhiFormFieldDescriptor = {
      ...PLANS,
      fields: [...ENTRY_FIELDS, { key: "note", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number, emptyOption: { label: literal("None") } }],
    };
    expect(checkPhiFormDescriptorFields({ fields: [broken] })).toEqual([
      'Field "plans.note" declares an emptyOption, which only a select field draws.',
    ]);
    expect(checkPhiFormDescriptorFields({ fields: [{ ...ENTRY_FIELDS[0]!, fields: ENTRY_FIELDS }] })).toEqual([
      'Field "title" has entry fields, which only a list field edits.',
    ]);
    expect(listPhiFormFieldsDeep(DESCRIPTOR.fields).map((field) => field.key)).toEqual(["plans", "title", "key", "billing"]);
  });

  it("builds the entry dialog's Form, keeps what the Form does not show, and finds a key taken by another entry", () => {
    expect(buildPhiFormListEntryDescriptor(PLANS, {})).toEqual({ schemaVersion: 1, key: "plans.entry", fields: ENTRY_FIELDS });
    expect(mergePhiFormListEntry(ENTRY_FIELDS, { id: 7, title: "Old", billing: "subscription", inUse: true }, { title: "New", key: "monthly" }))
      .toEqual({ id: 7, inUse: true, title: "New", key: "monthly" });
    const entries = [{ key: "monthly" }, { key: "yearly" }];
    expect(isPhiFormListKeyTaken(entries, "key", "yearly", 0)).toBe(true);
    expect(isPhiFormListKeyTaken(entries, "key", "yearly", 1)).toBe(false);
    expect(isPhiFormListKeyTaken(entries, "key", "", null)).toBe(false);
  });
});

const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const themeState = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });

function mount(plans: Record<string, unknown>[]) {
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
          labels={{ oneTime: "Einmalig", listApply: "Übernehmen" }}
          initialValues={{ plans }}
          submitOnEnter={false}
          onSubmit={onSubmit}
        />
      </PhiIntlLocaleProvider>
    </PhiConfigProvider>,
  );
  const submit = async () => {
    await act(async () => { ref.current!.submit(); });
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    return onSubmit.mock.calls.at(-1)![0] as Record<string, unknown>;
  };
  return { view, submit };
}

afterEach(cleanup);

describe("a list field in a Form", () => {
  it("shows its entries as rows under its own heading, an option by its label, and refuses a removal its config refuses", async () => {
    const { view } = mount([
      { id: 1, title: "Lifetime", key: "lifetime", billing: "one_time", inUse: true },
      { id: 2, title: "Monthly", key: "monthly", billing: "subscription" },
    ]);
    await waitFor(() => expect(screen.getByText("Lifetime")).toBeTruthy());
    expect(view.container.querySelector(".phi-card-control__title")?.textContent).toBe("Plans");
    // The heading is the label: the Form draws none of its own beside the list.
    expect(view.container.querySelector("label.phi-form-cell--label")).toBeNull();
    expect(screen.getByText("Einmalig")).toBeTruthy();
    const removes = [...view.container.querySelectorAll("button[aria-label='Remove']")] as HTMLButtonElement[];
    expect(removes.map((button) => button.disabled)).toEqual([true, false]);
  });

  it("edits an entry in its dialog, keeps what the dialog does not show, refuses a key another entry holds, and submits the list", async () => {
    const form = mount([
      { id: 1, title: "Monthly", key: "monthly", billing: "subscription" },
      { id: 2, title: "Yearly", key: "yearly", billing: "subscription" },
    ]);
    await waitFor(() => expect(screen.getByText("Monthly")).toBeTruthy());
    const edits = [...form.view.container.querySelectorAll("button[aria-label='Edit']")] as HTMLButtonElement[];
    await act(async () => { fireEvent.click(edits[1]!); });
    const dialog = await waitFor(() => {
      const element = document.querySelector(".ant-modal") as HTMLElement | null;
      expect(element?.textContent).toContain("Yearly");
      return element!;
    });
    const inputs = [...dialog.querySelectorAll("input")] as HTMLInputElement[];
    expect(inputs.map((input) => input.value).slice(0, 2)).toEqual(["Yearly", "yearly"]);
    await act(async () => { fireEvent.change(inputs[1]!, { target: { value: "monthly" } }); });
    await act(async () => { fireEvent.click(screen.getByText("Übernehmen")); });
    await waitFor(() => expect(dialog.textContent).toContain("Another entry already has this value."));
    await act(async () => { fireEvent.change(inputs[1]!, { target: { value: "annual" } }); });
    await act(async () => { fireEvent.click(screen.getByText("Übernehmen")); });
    await waitFor(() => expect(screen.getByText("annual")).toBeTruthy());
    expect(await form.submit()).toEqual({
      plans: [
        { id: 1, title: "Monthly", key: "monthly", billing: "subscription" },
        { id: 2, title: "Yearly", key: "annual", billing: "subscription" },
      ],
    });
  });

  it("adds an entry from its heading, refused while a required entry field is empty", async () => {
    const form = mount([]);
    await waitFor(() => expect(screen.getByText("No entries yet.")).toBeTruthy());
    await act(async () => { fireEvent.click(screen.getByText("Add")); });
    const dialog = await waitFor(() => document.querySelector(".ant-modal") as HTMLElement);
    await act(async () => { fireEvent.click(screen.getByText("Übernehmen")); });
    await waitFor(() => expect(dialog.textContent).toContain("A title is required."));
    const [title] = [...dialog.querySelectorAll("input")] as HTMLInputElement[];
    await act(async () => { fireEvent.change(title!, { target: { value: "Lifetime" } }); });
    await act(async () => { fireEvent.click(screen.getByText("Übernehmen")); });
    await waitFor(() => expect(screen.getByText("Lifetime")).toBeTruthy());
    expect(await form.submit()).toEqual({ plans: [{ title: "Lifetime" }] });
  });
});
