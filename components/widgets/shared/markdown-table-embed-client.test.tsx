import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhiCmsWidgetType } from "../../../constants/cms-widget-types";
import {
  PhiRuntimeModuleRenderClientManifestProvider,
  createPhiRuntimeModuleRenderClientManifest,
  definePhiRuntimeModuleRenderClient,
} from "../../runtime/runtime-module-render-client-manifest";
import { PHI_TABLE_WIDGET_DEFAULT_LABELS } from "../label-types/table";
import type { PhiTableWidgetConfig } from "../../../types/table-widget";
import { PhiMarkdownTableEmbedBlock, type PhiMarkdownTableEmbed } from "./markdown-body-client";

/*
 * An embedded Table is drawn by the Table Widget's Render Client, taken from the Area's manifest by its type
 * -- the entry `client-manifests/common.ts` loads with `next/dynamic` -- and not by any Table code of the
 * Markdown Widget's own. A stand-in under that type shows what it is handed; that nothing of the Table is in
 * the Markdown Widget's graph is held by the module graph audit (`pnpm audit:graph --check`).
 */

const received: unknown[] = [];
const manifest = createPhiRuntimeModuleRenderClientManifest([
  [PhiCmsWidgetType.Table, definePhiRuntimeModuleRenderClient((props: Record<string, unknown>) => {
    received.push(props);
    return <table data-stand-in="table" />;
  })],
]);

const config: PhiTableWidgetConfig = {
  presentation: { title: "Prices", columns: [{ key: "name", fieldKey: "name", title: "Product" }], layout: { mode: "auto", overflowX: "auto" } },
  features: {},
  source: { providerKey: "@acme/prices/tables/prices", resourceKey: "prices" },
  signalRoutes: null,
};

function draw(embed: PhiMarkdownTableEmbed) {
  received.length = 0;
  return renderToStaticMarkup(
    <PhiRuntimeModuleRenderClientManifestProvider manifest={manifest}>
      <PhiMarkdownTableEmbedBlock embed={embed} spacing={{ marginBlockEnd: "8px" }} />
    </PhiRuntimeModuleRenderClientManifestProvider>,
  );
}

describe("a Table embedded in Markdown, in the browser", () => {
  it("hands the Table Widget's Render Client the config, the words and the render mode", () => {
    const html = draw({ caption: "Prices", table: { config, labels: PHI_TABLE_WIDGET_DEFAULT_LABELS, renderMode: "live" }, notice: null });
    expect(html).toContain('data-stand-in="table"');
    expect(html).toMatch(/^<figure class="phi-markdown-table-embed"/u);
    expect(received).toEqual([{
      config,
      labels: PHI_TABLE_WIDGET_DEFAULT_LABELS,
      renderMode: "live",
      onStateChange: expect.any(Function),
    }]);
    // The caption is the Table's title while the Table draws, and not said twice.
    expect(html).not.toContain(">Prices<");
  });

  it("draws a refused embed as its caption, and its notice where one is given, without asking for the Table", () => {
    const live = draw({ caption: "Prices", table: null, notice: null });
    expect(live).toContain(">Prices<");
    expect(live).not.toContain("phi-typography--warning");
    const authored = draw({ caption: "Prices", table: null, notice: "No Module offers the Table." });
    expect(authored).toMatch(/phi-typography--warning[^>]*>No Module offers the Table\.</u);
    expect(received).toEqual([]);
  });
});
