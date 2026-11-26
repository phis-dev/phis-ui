import { createElement, type ReactNode } from "react";
import { prerenderToNodeStream } from "react-dom/static";
import { describe, expect, it, vi } from "vitest";

import { PhiConfigProvider } from "../root/phi-config-provider";
import { PhiIntlLocaleProvider } from "../root/phi-intl-locale";
import { resolvePhiRootThemeState } from "../root/phi-root-theme-resolver";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PHI_SHARED_FORM_PROVIDER_REGISTRY } from "./shared-form-provider-registry";
import { PhiButtonControl } from "../controls/phi-button-control";
import { PhiTextControl } from "../controls/phi-text-control";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "./form-provider-contract";
import type { PhiFormFieldProviderProps, PhiFormProviderRegistry, PhiFormSize } from "./form-provider-registry";
import { PHI_AUTH_FORM_PROVIDER_REGISTRY } from "../../plugins/runtime-modules/auth/form-provider-registry";
import { PHI_ASSET_FORM_PROVIDER_REGISTRY } from "../../plugins/runtime-modules/asset/form-ui-provider";
import { PHI_AUTH_FORM_FIELD_PROVIDER_KEYS } from "./form-provider-contract";
import {
  PHI_ASSET_MEDIA_ASSET_FORM_PROVIDER_DESCRIPTOR,
  PHI_ASSET_MEDIA_ASSETS_FORM_PROVIDER_DESCRIPTOR,
} from "../../plugins/runtime-modules/asset/form-providers";

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

vi.mock("../media/use-authoring-asset-details", () => ({
  usePhiAuthoringAssetDetails: () => null,
}));
vi.mock("../widgets/client/shared/use-page-reference-options", () => ({
  usePhiPageReferenceOptions: () => ({ options: [], failed: false }),
}));
// The Media fields' library and Collection bindings talk to the signal runtime; the picker they feed is drawn here.
vi.mock("../media/phi-media-picker-binding", async (importOriginal) => ({
  ...await importOriginal<object>(),
  usePhiMediaPickerBinding: () => ({ assets: [] }),
}));
vi.mock("../media/use-media-library-add-picker", async (importOriginal) => ({
  ...await importOriginal<object>(),
  usePhiMediaLibraryAddPicker: () => ({ assets: [] }),
}));
vi.mock("../widgets/client/shared/phi-collection-provider", async (importOriginal) => ({
  ...await importOriginal<object>(),
  usePhiCollectionProvider: () => ({ provider: null }),
}));
vi.mock("../runtime/runtime-module-calendar-adapter-client-manifest", async () => {
  const { PHI_GREGORY_CALENDAR_ADAPTER_CLIENT: adapter } = await import("../calendar/gregory-calendar-adapter-client");
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
