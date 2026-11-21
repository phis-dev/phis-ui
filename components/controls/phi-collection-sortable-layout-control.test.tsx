import type { ReactNode } from "react";
import { renderToStaticMarkup as renderBare } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhiConfigProvider } from "../root/phi-config-provider";
import { resolvePhiRootThemeState } from "../root/phi-root-theme-resolver";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PhiCollectionReorderContext, usePhiCollectionReorder } from "./phi-collection-reorder-context";
import { PhiCollectionSortableLayoutControl } from "./phi-collection-sortable-layout-control";

const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const themeState = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });

function renderToStaticMarkup(children: ReactNode) {
  return renderBare(
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
      {children}
    </PhiConfigProvider>,
  );
}

/* What an item drawn inside the layout sees of the reordering: nothing, so a nested Collection is not handed it. */
function Probe({ name }: { name: string }) {
  const reorder = usePhiCollectionReorder();
  return <button type="button">{`${name}:${reorder ? "offered" : "none"}`}</button>;
}

describe("PhiCollectionSortableLayoutControl", () => {
  const reorder = { itemKeys: [7, "b"], onReorder: () => undefined, handleLabel: "Drag to reorder" };

  it("puts one handle on each item, beside what the item draws, and lays them out as a grid or a stack", () => {
    const grid = renderToStaticMarkup(
      <PhiCollectionSortableLayoutControl mode="grid" gap={8} minColumnWidth={120} items={[<Probe key="a" name="a" />, <Probe key="b" name="b" />]} reorder={reorder} />,
    );
    expect(grid.match(/aria-label="Drag to reorder"/gu)).toHaveLength(2);
    expect(grid).toContain("grid-template-columns:repeat(auto-fill, minmax(120px, 1fr))");
    expect(grid).toContain("a:none");
    const stack = renderToStaticMarkup(
      <PhiCollectionReorderContext.Provider value={reorder}>
        <PhiCollectionSortableLayoutControl mode="stack" gap={8} minColumnWidth={120} items={[<Probe key="a" name="a" />, <Probe key="b" name="b" />]} reorder={reorder} />
      </PhiCollectionReorderContext.Provider>,
    );
    expect(stack).toContain("flex-direction:column");
    // The item's own button stays its own, and a Collection inside an item is offered nothing.
    expect(stack).toContain("<button type=\"button\">b:none</button>");
  });
});
