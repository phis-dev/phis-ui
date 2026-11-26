// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render as mount, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { prerenderToNodeStream } from "react-dom/static";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PhiConfigProvider } from "../../components/root/phi-config-provider";
import { PhiIntlLocaleProvider } from "../../components/root/phi-intl-locale";
import { resolvePhiRootThemeState } from "../../components/root/phi-root-theme-resolver";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PHI_SHARED_FORM_PROVIDER_REGISTRY } from "../../components/forms/shared-form-provider-registry";
import { createPhiPageReference } from "../../types/references";
import { PhiButtonControl } from "../../components/controls/phi-button-control";
import { PhiTextControl } from "../../components/controls/phi-text-control";
import { PhiFormControl } from "../../components/controls/phi-form-control";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "../../components/forms/form-provider-contract";
import type { PhiFormFieldProviderProps, PhiFormProviderRegistry, PhiFormSize } from "../../components/forms/form-provider-registry";
import { PHI_AUTH_FORM_PROVIDER_REGISTRY } from "./auth/form-provider-registry";
import { PHI_ASSET_FORM_PROVIDER_REGISTRY } from "./asset/form-ui-provider";
import { PHI_AUTH_FORM_FIELD_PROVIDER_KEYS } from "../../components/forms/form-provider-contract";
import {
  PHI_ASSET_MEDIA_ASSET_FORM_PROVIDER_DESCRIPTOR,
  PHI_ASSET_MEDIA_ASSETS_FORM_PROVIDER_DESCRIPTOR,
} from "./asset/form-providers";

/*
 * A Form has a size, and every field draws its controls in it (FORMS.md, "Size"). A field that draws a
 * control of its own size -- a `medium` input left in a `small` Form, a button written `size="small"` in
 * every Form -- stands out of every row around it, and nothing else would notice: the Form hands the
 * size down and has no way to see what a field made of it. So every field of every registered field
 * type is rendered here at both sizes, and its markup is held to three things:
 *
 * 1. small and medium differ, so the size reached something the field draws;
 * 2. the small markup has no Ant Design control at its normal size -- each control root that has a
 *    small form carries it;
 * 3. the medium markup has none at the small size, so nothing is written small whatever the Form says.
 *
 * Rendered with `prerender`, which waits for the lazy field Controls to load, inside a real Theme.
 */

/*
 * The Media pickers' open state, which their binding holds: closed for the size, open for the popup
 * container (below), where the popover the picker draws has to be there to be found.
 */
const pickerBinding = vi.hoisted(() => ({ open: undefined as boolean | undefined }));

vi.mock("../../components/media/use-authoring-asset-details", () => ({
  usePhiAuthoringAssetDetails: () => null,
}));
vi.mock("../../components/widgets/client/shared/use-page-reference-options", () => ({
  usePhiPageReferenceOptions: () => ({ options: [], failed: false }),
}));
// The Media fields' library and Collection bindings talk to the signal runtime; the picker they feed is drawn here.
vi.mock("../../components/media/phi-media-picker-binding", async (importOriginal) => ({
  ...await importOriginal<object>(),
  usePhiMediaPickerBinding: () => ({ assets: [], open: pickerBinding.open }),
}));
vi.mock("../../components/media/use-media-library-add-picker", async (importOriginal) => ({
  ...await importOriginal<object>(),
  usePhiMediaLibraryAddPicker: () => ({ assets: [], open: pickerBinding.open }),
}));
vi.mock("../../components/widgets/client/shared/phi-collection-provider", async (importOriginal) => ({
  ...await importOriginal<object>(),
  usePhiCollectionProvider: () => ({ provider: null }),
}));
vi.mock("../../components/runtime/runtime-module-calendar-adapter-client-manifest", async () => {
  const { PHI_GREGORY_CALENDAR_ADAPTER_CLIENT: adapter } = await import("../../components/calendar/gregory-calendar-adapter-client");
  return { usePhiCalendarAdapterClient: () => adapter };
});

const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const themeState = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });

function withTheme(children: ReactNode) {
  return (
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
      <PhiIntlLocaleProvider locale="en" timeZone="UTC" renderedAt={0}>{children}</PhiIntlLocaleProvider>
    </PhiConfigProvider>
  );
}

/* A field that throws renders its placeholder at both sizes, which would read as a size it ignores. */
async function render(element: ReactNode) {
  const errors: unknown[] = [];
  const { prelude } = await prerenderToNodeStream(withTheme(element), { onError: (error) => { errors.push(error); } });
  let html = "";
  for await (const chunk of prelude) html += String(chunk);
  if (errors.length > 0) throw errors[0];
  return html;
}

const OPTIONS = [{ value: "1", label: "One" }, { value: "2", label: "Two" }];

/** What each field needs to draw itself whole: a value that shows every part, and the config it requires. */
const FIXTURES: Readonly<Record<string, Partial<PhiFormFieldProviderProps>>> = {
  [PHI_FORM_FIELD_PROVIDER_KEYS.checkbox]: { controlLabel: "I agree", checked: false },
  [PHI_FORM_FIELD_PROVIDER_KEYS.switch]: { checked: false },
  [PHI_FORM_FIELD_PROVIDER_KEYS.select]: { value: "1" },
  [PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect]: { value: ["1"] },
  [PHI_FORM_FIELD_PROVIDER_KEYS.segmented]: { value: "1" },
  [PHI_FORM_FIELD_PROVIDER_KEYS.number]: { value: 3 },
  // The rail has one size in Ant Design; the number beside it is what a small Form draws small.
  [PHI_FORM_FIELD_PROVIDER_KEYS.slider]: { value: 3, field: { config: { showInput: true } } as never },
  [PHI_FORM_FIELD_PROVIDER_KEYS.datetime]: { value: "2026-11-26T10:00:00.000Z" },
  [PHI_FORM_FIELD_PROVIDER_KEYS.linkTarget]: { value: { kind: "external", href: "https://example.com" } },
  [PHI_FORM_FIELD_PROVIDER_KEYS.money]: { value: { currency: "CHF", minor: "100" }, field: { config: { currency: "CHF" } } as never },
  [PHI_FORM_FIELD_PROVIDER_KEYS.country]: { value: "CH" },
  [PHI_FORM_FIELD_PROVIDER_KEYS.dimension]: { value: { width: "10px", height: "50%" } },
  [PHI_AUTH_FORM_FIELD_PROVIDER_KEYS.termsConsent]: {
    checked: false,
    field: { config: { href: { kind: "literal", value: "/terms" }, linkLabel: { kind: "literal", value: "terms" } } } as never,
  },
  [PHI_ASSET_MEDIA_ASSET_FORM_PROVIDER_DESCRIPTOR.key]: { value: 5 },
  [PHI_ASSET_MEDIA_ASSETS_FORM_PROVIDER_DESCRIPTOR.key]: { value: [] },
};

/*
 * The fields that draw at one size whatever the Form says, each with its reason. Nothing else may be
 * listed: a field that cannot follow the size is a decision written here, not a gap nobody saw.
 */
const ONE_SIZE: Readonly<Record<string, string>> = {
  // A Table or a Tree in a Form is collection chrome -- its header, toolbar and rows -- small at every size.
  [PHI_FORM_FIELD_PROVIDER_KEYS.table]: "collection chrome, small at every size",
  [PHI_FORM_FIELD_PROVIDER_KEYS.tree]: "collection chrome, small at every size",
};

/* Each Ant Design control root that has a small form, and the class that says it is in it. */
const SMALL_CLASS: Readonly<Record<string, string>> = {
  "ant-btn": "ant-btn-sm",
  "ant-select": "ant-select-sm",
  "ant-input-number": "ant-input-number-sm",
  "ant-input-affix-wrapper": "ant-input-affix-wrapper-sm",
  "ant-picker": "ant-picker-small",
  "ant-segmented": "ant-segmented-sm",
  "ant-switch": "ant-switch-small",
};

function classLists(html: string) {
  return [...html.matchAll(/class="([^"]*)"/gu)].map((match) => match[1].split(/\s+/u));
}

/** The control roots drawn at the size asked about: a base class present, its small class present or absent. */
function rootsDrawn(html: string, small: boolean) {
  return classLists(html).flatMap((classes) => Object.entries(SMALL_CLASS)
    .filter(([base, smallClass]) => classes.includes(base) && classes.includes(smallClass) === small)
    .map(([base]) => base));
}

function registeredFields(registries: readonly PhiFormProviderRegistry[]) {
  return registries.flatMap((registry) => [...registry.fieldTypesByKey.values()]);
}

const FIELDS = registeredFields([
  PHI_SHARED_FORM_PROVIDER_REGISTRY,
  PHI_AUTH_FORM_PROVIDER_REGISTRY,
  PHI_ASSET_FORM_PROVIDER_REGISTRY,
]).filter((provider) => provider.presentation === "control" && !(provider.key in ONE_SIZE));

async function renderField(provider: (typeof FIELDS)[number], size: PhiFormSize) {
  const fixture = FIXTURES[provider.key] ?? {};
  const field = {
    key: "field",
    fieldProviderKey: provider.key,
    ...(fixture.field ?? {}),
  } as PhiFormFieldProviderProps["field"];
  return render(createElement(provider.Control, {
    options: OPTIONS,
    value: "value",
    onChange: () => undefined,
    formContext: { getValues: () => ({}), setValues: () => undefined, holdSubmit: () => undefined },
    ...fixture,
    field,
    label: "Field",
    size,
  }));
}

describe("every field draws its controls in the Form's size", () => {
  it("knows every field it exempts", () => {
    const keys = new Set(registeredFields([PHI_SHARED_FORM_PROVIDER_REGISTRY]).map((provider) => provider.key));
    for (const key of Object.keys(ONE_SIZE)) expect(keys.has(key as never)).toBe(true);
  });

  it("tells a field that ignores the size, and one that writes a size of its own", async () => {
    const ignoring = () => <PhiTextControl value="x" />;
    expect(await render(createElement(ignoring))).toBe(await render(createElement(ignoring)));
    expect(rootsDrawn(await render(<PhiTextControl value="x" />), false)).toEqual(["ant-input-affix-wrapper"]);
    expect(rootsDrawn(await render(<PhiButtonControl size="small" label="x" />), true)).toEqual(["ant-btn"]);
  });

  it.each(FIELDS.map((provider) => [provider.key, provider] as const))("%s", async (_key, provider) => {
    const small = await renderField(provider, "small");
    const medium = await renderField(provider, "medium");
    expect(small, "the size reaches nothing the field draws").not.toBe(medium);
    expect(rootsDrawn(small, false), "controls left at their normal size in a small Form").toEqual([]);
    expect(rootsDrawn(medium, true), "controls drawn small in a medium Form").toEqual([]);
  });
});

/*
 * Where the Form's size comes from (FORMS.md, "Size"): the placement's, else the descriptor's
 * `layout.size`, else `medium`. Drawn whole, through `PhiFormControl`, and judged as the fields above are.
 */
describe("a Form's size", () => {
  const descriptor = (size?: PhiFormSize) => ({
    schemaVersion: 1 as const,
    key: "sized",
    fields: [
      { key: "name", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text, label: { kind: "literal" as const, value: "Name" } },
      {
        key: "kind",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: { kind: "literal" as const, value: "Kind" },
        options: OPTIONS.map((option) => ({ value: option.value, label: { kind: "literal" as const, value: option.label } })),
      },
    ],
    ...(size ? { layout: { size } } : {}),
  });
  const renderForm = (size: PhiFormSize | undefined, placed?: PhiFormSize) => render(
    <PhiFormControl
      descriptor={descriptor(size)}
      initialValues={{ name: "Ada", kind: "1" }}
      submitOnEnter={false}
      onSubmit={() => undefined}
      {...(placed ? { size: placed } : {})}
    />,
  );

  it("is the descriptor's layout.size where the placement states none", async () => {
    const small = await renderForm("small");
    expect(rootsDrawn(small, true)).toEqual(["ant-select"]);
    expect(rootsDrawn(small, false), "controls left at their normal size in a small Form").toEqual([]);
    // A plain text input has no affix wrapper; its own small class says it.
    expect(classLists(small).some((classes) => classes.includes("ant-input-sm"))).toBe(true);
    expect(small).not.toBe(await renderForm(undefined));
  });

  it("is the placement's where it states one, and medium where nobody does", async () => {
    const placedMedium = await renderForm("small", "medium");
    expect(rootsDrawn(placedMedium, true), "a placement's medium beside a descriptor's small").toEqual([]);
    expect(classLists(placedMedium).some((classes) => classes.includes("ant-input-sm"))).toBe(false);
    expect(rootsDrawn(await renderForm("medium", "small"), false)).toEqual([]);
    const unstated = await renderForm(undefined);
    expect(rootsDrawn(unstated, true)).toEqual([]);
    expect(unstated).toBe(await renderForm("medium"));
  });
});

/*
 * Where a field's floating layers go (FORMS.md, "Popup container"): a Form hands its `getPopupContainer`
 * to every field, and every list, panel, unit list or tooltip a field opens is mounted in it. A field
 * that leaves one at the document's end is the HTML editor's image popover again, where a unit list
 * stood outside the popover and a click on a unit chose nothing. So every field of every registered field
 * type is mounted with a container of its own, everything that opens a layer is opened, and:
 *
 * 1. no layer stands outside the container;
 * 2. a field listed in `FLOATING` opened at least one, so the check reached what the field draws;
 * 3. a field not listed opened none, so the list says which fields have a floating layer.
 *
 * `table` and `tree` stand out of this as they stand out of the size (`ONE_SIZE`): the lists their cell
 * editors open are the Table and Tree Controls' own and are not handed the container (FORMS.md).
 */

/* The fields that open a floating layer, with what it is. */
const FLOATING: Readonly<Record<string, string>> = {
  [PHI_FORM_FIELD_PROVIDER_KEYS.select]: "the option list",
  [PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect]: "the option list",
  [PHI_FORM_FIELD_PROVIDER_KEYS.cascader]: "the levels",
  [PHI_FORM_FIELD_PROVIDER_KEYS.slider]: "the value's tooltip",
  [PHI_FORM_FIELD_PROVIDER_KEYS.datetime]: "the calendar panel",
  [PHI_FORM_FIELD_PROVIDER_KEYS.linkTarget]: "the Page tree",
  [PHI_FORM_FIELD_PROVIDER_KEYS.dimension]: "the unit lists",
  [PHI_FORM_FIELD_PROVIDER_KEYS.country]: "the country list",
  [PHI_FORM_FIELD_PROVIDER_KEYS.address]: "the country list",
  [PHI_ASSET_MEDIA_ASSET_FORM_PROVIDER_DESCRIPTOR.key]: "the Media picker",
  [PHI_ASSET_MEDIA_ASSETS_FORM_PROVIDER_DESCRIPTOR.key]: "the Media picker",
};

/* What a field needs beyond its size fixture to open its layer: a Page link, a tooltip that stays. */
const POPUP_FIXTURES: Readonly<Record<string, Partial<PhiFormFieldProviderProps>>> = {
  [PHI_FORM_FIELD_PROVIDER_KEYS.linkTarget]: { value: { kind: "page", reference: createPhiPageReference({ kind: "site", pageScopeId: 1 }) } },
  [PHI_FORM_FIELD_PROVIDER_KEYS.slider]: { value: 3, field: { config: { showInput: true, tooltipMode: "always" } } as never },
};

const LAYER_SELECTOR = [
  ".ant-select-dropdown",
  ".ant-picker-dropdown",
  ".ant-cascader-dropdown",
  ".ant-popover",
  ".ant-tooltip",
  ".ant-dropdown",
].join(", ");

/* Everything that opens a layer: a select's box, a picker's input, a colour swatch. */
function openEveryLayer(root: HTMLElement) {
  for (const box of root.querySelectorAll<HTMLElement>(".ant-select-content, .ant-select-selector")) fireEvent.mouseDown(box);
  for (const input of root.querySelectorAll<HTMLElement>(".ant-picker input")) {
    fireEvent.mouseDown(input);
    fireEvent.focus(input);
    fireEvent.click(input);
  }
  for (const swatch of root.querySelectorAll<HTMLElement>(".ant-color-picker-trigger")) fireEvent.click(swatch);
}

describe("every field mounts its floating layers in the Form's popup container", () => {
  afterEach(() => {
    cleanup();
    pickerBinding.open = undefined;
    document.body.replaceChildren();
  });

  it("knows every field it lists", () => {
    const keys = new Set(FIELDS.map((provider) => provider.key as string));
    for (const key of Object.keys(FLOATING)) expect(keys.has(key)).toBe(true);
  });

  it.each(FIELDS.map((provider) => [provider.key, provider] as const))("%s", async (key, provider) => {
    pickerBinding.open = true;
    const container = document.createElement("div");
    document.body.append(container);
    const fixture = { ...FIXTURES[provider.key], ...POPUP_FIXTURES[provider.key] };
    const view = mount(withTheme(createElement(provider.Control, {
      options: OPTIONS,
      value: "value",
      onChange: () => undefined,
      formContext: { getValues: () => ({}), setValues: () => undefined, holdSubmit: () => undefined },
      ...fixture,
      field: { key: "field", fieldProviderKey: provider.key, ...(fixture.field ?? {}) } as PhiFormFieldProviderProps["field"],
      label: "Field",
      size: "small",
      getPopupContainer: () => container,
    })));
    // The lazy field Controls stand as a placeholder until their code is there.
    await waitFor(() => expect(view.container.querySelector("[aria-busy='true']")).toBeNull());
    await act(async () => { openEveryLayer(view.container); });
    const layers = () => [...document.querySelectorAll<HTMLElement>(LAYER_SELECTOR)];
    if (key in FLOATING) {
      await waitFor(() => expect(layers().length, `${FLOATING[key]} opened nowhere`).toBeGreaterThan(0));
    } else {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
      expect(layers(), "a field not listed in FLOATING opened a layer").toEqual([]);
    }
    const outside = layers().filter((layer) => !container.contains(layer)).map((layer) => layer.className);
    expect(outside, "layers mounted outside the Form's popup container").toEqual([]);
  });

  /* Drawn whole: the Form hands its option to the field, and without one a list goes where it always went. */
  const descriptor = {
    schemaVersion: 1 as const,
    key: "popup",
    fields: [{
      key: "kind",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: { kind: "literal" as const, value: "Kind" },
      options: OPTIONS.map((option) => ({ value: option.value, label: { kind: "literal" as const, value: option.label } })),
    }],
  };
  async function openFormSelect(getPopupContainer?: () => HTMLElement) {
    const view = mount(withTheme(
      <PhiFormControl
        descriptor={descriptor}
        initialValues={{ kind: "1" }}
        submitOnEnter={false}
        onSubmit={() => undefined}
        {...(getPopupContainer ? { getPopupContainer } : {})}
      />,
    ));
    await waitFor(() => expect(view.container.querySelector(".ant-select-content")).not.toBeNull());
    await act(async () => { openEveryLayer(view.container); });
    return waitFor(() => {
      const list = document.querySelector<HTMLElement>(".ant-select-dropdown");
      expect(list).not.toBeNull();
      return list!;
    });
  }

  it("is PhiFormControl's getPopupContainer, handed to every field", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    expect(container.contains(await openFormSelect(() => container))).toBe(true);
  });

  it("is the document's end where the Form names none", async () => {
    const list = await openFormSelect();
    expect(list.closest(".phi-form-descriptor")).toBeNull();
    expect(document.body.contains(list)).toBe(true);
  });
});
