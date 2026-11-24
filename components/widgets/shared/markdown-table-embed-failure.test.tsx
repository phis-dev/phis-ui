// @vitest-environment happy-dom
import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";

import { PhiCmsWidgetType } from "../../../constants/cms-widget-types";
import {
  PhiRuntimeModuleRenderClientManifestProvider,
  createPhiRuntimeModuleRenderClientManifest,
  definePhiRuntimeModuleRenderClient,
} from "../../runtime/runtime-module-render-client-manifest";
import { PHI_TABLE_WIDGET_DEFAULT_LABELS } from "../label-types/table";
import type { PhiTableWidgetConfig, PhiTableWidgetState } from "../../../types/table-widget";
import { PHI_TABLE_PROVIDER_REFUSED_CODE } from "../client/shared/phi-table-provider-refusal";
import { PhiMarkdownTableEmbedBlock } from "./markdown-body-client";

/*
 * The caption of an embedded Table is the Table's title, so it goes wherever the Table goes. A Table whose
 * read fails draws nothing live -- a viewer the Provider refuses saw the caption vanish with it. A stand-in
 * under the Table's type reports the state a real Table would and draws nothing on a failure.
 */

const config: PhiTableWidgetConfig = {
  presentation: { title: "Prices", columns: [{ key: "name", fieldKey: "name", title: "Product" }], layout: { mode: "auto", overflowX: "auto" } },
  features: {},
  source: { providerKey: "@acme/prices/tables/prices", resourceKey: "prices" },
  signalRoutes: null,
};

function drawWithReadEnding(errorCode: string | null) {
  const manifest = createPhiRuntimeModuleRenderClientManifest([
    [PhiCmsWidgetType.Table, definePhiRuntimeModuleRenderClient(({ onStateChange }: { onStateChange?: (state: PhiTableWidgetState) => void }) => {
      useEffect(() => {
        onStateChange?.({ loading: false, errorCode } as PhiTableWidgetState);
      }, [onStateChange]);
      return errorCode && errorCode !== PHI_TABLE_PROVIDER_REFUSED_CODE ? null : <table data-stand-in="table"><caption>Prices</caption></table>;
    })],
  ]);
  let view: ReturnType<typeof render> | null = null;
  act(() => {
    view = render(
      <PhiRuntimeModuleRenderClientManifestProvider manifest={manifest}>
        <PhiMarkdownTableEmbedBlock
          embed={{ caption: "Prices", table: { config, labels: PHI_TABLE_WIDGET_DEFAULT_LABELS, renderMode: "live" }, notice: null }}
          spacing={{}}
        />
      </PhiRuntimeModuleRenderClientManifestProvider>,
    );
  });
  return view!.container;
}

describe("an embedded Table that cannot draw", () => {
  it("keeps its caption when the read fails", () => {
    const container = drawWithReadEnding("request-failed");
    expect(container.querySelector("[data-stand-in]")).toBeNull();
    expect(container.textContent).toBe("Prices");
  });

  it("says the caption once while the Table draws, a refused read it explains included", () => {
    expect(drawWithReadEnding(null).textContent).toBe("Prices");
    expect(drawWithReadEnding(PHI_TABLE_PROVIDER_REFUSED_CODE).textContent).toBe("Prices");
  });
});
