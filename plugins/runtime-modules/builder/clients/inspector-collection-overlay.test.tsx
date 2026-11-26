// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PhiConfigProvider } from "../../../../components/root/phi-config-provider";
import { resolvePhiRootThemeState } from "../../../../components/root/phi-root-theme-resolver";
import { PHI_INSPECTOR_DIALOG_FIELD_LABEL_SHARE } from "../../../../components/widgets/inspector-field-row";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../../../theme/phi-theme-palette";
import type { PhiCmsConfigField } from "../../../../types/cms-plugins";
import { renderPhiInspectorConfigField } from "./inspector-config-field";

/*
 * A list in the Inspector is a row -- its label and an Edit button -- and is edited in a dialog
 * (BUILDER.md, "Field rows"). A list inside an entry of that dialog is edited in place there, and the
 * dialog's rows split label and control 10 : 14.
 */

const columns: PhiCmsConfigField = {
  key: "columns",
  type: "collection",
  presentation: "overlay",
  label: "Columns",
  itemKeyField: "key",
  itemLabelField: "title",
  addLabel: "Add column",
  emptyLabel: "No columns",
  itemFields: [
    { key: "key", type: "string", label: "Key" },
    {
      key: "badges",
      type: "collection",
      label: "Badges",
      itemKeyField: "key",
      addLabel: "Add badge",
      itemFields: [{ key: "key", type: "string", label: "Badge key" }],
    },
  ],
};

const value = [{ key: "name", title: "Name Column", badges: [] }, { key: "mail", title: "Mail Column", badges: [] }];

/* The Inspector's Controls read the root config, so the field renders inside a real one. */
const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const themeState = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });

function renderField() {
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
      {renderPhiInspectorConfigField({
        field: columns,
        value,
        defaultValue: undefined,
        config: { columns: value },
        disabled: false,
        onChange: () => {},
      })}
    </PhiConfigProvider>,
  );
}

afterEach(cleanup);

describe("an overlay collection in the Inspector", () => {
  it("is its label and a normal-size Edit button, with nothing of the list in the column", () => {
    renderField();
    expect(screen.getByText("Columns")).toBeTruthy();
    const edit = screen.getByRole("button", { name: /Edit/u });
    expect(edit.className).not.toMatch(/ant-btn-sm/u);
    expect(screen.queryByText("Name Column")).toBeNull();
    expect(screen.queryByText("Add column")).toBeNull();
  });

  it("opens the entries in a dialog, where an entry's own list is edited in place", async () => {
    renderField();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Edit/u }));
    });
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getAllByText("Name Column").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Add column")).toBeTruthy();
    // The nested list: its add button stands in the dialog, and no second Edit button opens another one.
    expect(within(dialog).getAllByText("Add badge")).toHaveLength(2);
    expect(within(dialog).queryByRole("button", { name: /^Edit$/u })).toBeNull();
  });

  it("splits a row in the dialog 10 : 14, as a Form's medium tier does", async () => {
    expect(PHI_INSPECTOR_DIALOG_FIELD_LABEL_SHARE).toBeCloseTo(10 / 24);
    renderField();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Edit/u }));
    });
    const dialog = await screen.findByRole("dialog");
    const label = within(dialog).getAllByText("Key")[0]!;
    const column = label.closest("[style*='flex']") as HTMLElement | null;
    const bases = [...dialog.querySelectorAll<HTMLElement>("[style]")].map((element) => element.style.flex);
    expect(column).toBeTruthy();
    expect(bases.some((flex) => flex.includes(`${PHI_INSPECTOR_DIALOG_FIELD_LABEL_SHARE}`))).toBe(true);
    expect(bases.some((flex) => flex.includes("140px"))).toBe(false);
  });
});
