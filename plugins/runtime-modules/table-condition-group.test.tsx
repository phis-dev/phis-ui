// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PhiConfigProvider } from "../../components/root/phi-config-provider";
import { PhiIntlLocaleProvider } from "../../components/root/phi-intl-locale";
import { resolvePhiRootThemeState } from "../../components/root/phi-root-theme-resolver";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import type { PhiCmsConfigField } from "../../types/cms-plugins";
import { buildPhiInspectorConfigPathPatch, renderPhiInspectorConfigField } from "./builder/clients/inspector-config-field";
import { resolvePhiInspectorConditionGroupWrite } from "./builder/clients/inspector-condition-group";
import { PHI_TABLE_WIDGET_DEFINITION } from "./core/widgets/table/config";
import { createPhiUserManagementControllerAddress } from "./user-management/controller/address";

/*
 * A Table's condition group as the Builder's Inspector writes it, read back by the Table's strict parser:
 * whatever the Inspector writes, the Widget reads (`condition-group`, types/cms-plugins.ts). A Core
 * Widget read through the Builder's field rules -- hence beside the module system rather than in either
 * Module.
 */

const KEY = "features.editing.disabledWhen";
const field = PHI_TABLE_WIDGET_DEFINITION.fields.find((entry) => entry.key === KEY) as PhiCmsConfigField;
const baseConfig = PHI_TABLE_WIDGET_DEFINITION.defaultConfig as Record<string, unknown>;

/* The config the Widget holds after the Inspector's patch, parsed as the page parses it. */
function parseAfter(patch: Record<string, unknown>) {
  const config = { ...baseConfig, ...buildPhiInspectorConfigPathPatch(baseConfig, patch) };
  return PHI_TABLE_WIDGET_DEFINITION.parseConfig(config);
}

const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const themeState = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });

function renderField(value: unknown, onChange: (patch: Record<string, unknown>) => void) {
  return render(
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
        {renderPhiInspectorConfigField({ field, value, defaultValue: undefined, config: {}, disabled: false, onChange })}
      </PhiIntlLocaleProvider>
    </PhiConfigProvider>,
  );
}

async function openDialog() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Edit/u }));
  });
  return screen.findByRole("dialog");
}

afterEach(cleanup);

describe("a Table condition group written by the Inspector", () => {
  it("is one field, a label and an Edit button", () => {
    expect(field).toMatchObject({ type: "condition-group", label: "Editing Disabled Conditions" });
    expect(PHI_TABLE_WIDGET_DEFINITION.fields.some((entry) => entry.key.endsWith(".match") || entry.key.endsWith(".conditions"))).toBe(false);
    renderField(undefined, () => {});
    expect(screen.getByText("Editing Disabled Conditions")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Edit/u })).toBeTruthy();
  });

  it("writes match \"all\" with the first condition added, and the parser reads it", async () => {
    const onChange = vi.fn();
    renderField(undefined, onChange);
    const dialog = await openDialog();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: /Add condition/u }));
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    const patch = onChange.mock.calls[0]![0] as Record<string, unknown>;
    expect(patch[KEY]).toEqual({ match: "all", conditions: [{ source: "row", valuePath: "disabled", operator: "truthy" }] });
    expect(parseAfter(patch).features.editing?.disabledWhen).toEqual({
      match: "all",
      conditions: [{ source: "row", valuePath: "disabled", operator: "truthy" }],
    });
  });

  it("removes the whole key with the last condition, and the parser reads no condition", async () => {
    const onChange = vi.fn();
    renderField({ match: "any", conditions: [{ source: "row", valuePath: "locked", operator: "truthy" }] }, onChange);
    const dialog = await openDialog();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: /Remove/u }));
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    const patch = onChange.mock.calls[0]![0] as Record<string, unknown>;
    expect(patch).toEqual({ [KEY]: undefined });
    expect(parseAfter(patch).features.editing?.disabledWhen).toBeUndefined();
  });

  it("holds a Controller condition without its address, and writes it once the address is there", () => {
    const controller = { source: "controller", valuePath: "permissions.readOnly", operator: "truthy" };
    expect(resolvePhiInspectorConditionGroupWrite({ match: "any", conditions: [controller] }).kind).toBe("hold");
    const complete = resolvePhiInspectorConditionGroupWrite({
      match: "any",
      conditions: [{ ...controller, controllerAddress: createPhiUserManagementControllerAddress() }],
    });
    expect(complete.kind).toBe("write");
    if (complete.kind !== "write") return;
    expect(parseAfter({ [KEY]: complete.value }).features.editing?.disabledWhen).toMatchObject({ match: "any" });
  });

  it("writes nothing for a match chosen before any condition", () => {
    expect(resolvePhiInspectorConditionGroupWrite({ match: "any" })).toEqual({ kind: "remove" });
    expect(resolvePhiInspectorConditionGroupWrite({ match: "any", conditions: [] })).toEqual({ kind: "remove" });
  });
});
