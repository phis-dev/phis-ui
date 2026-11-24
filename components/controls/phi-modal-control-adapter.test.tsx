// @vitest-environment happy-dom
import { cleanup, render as renderBare } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { PhiConfigProvider } from "../root/phi-config-provider";
import { resolvePhiRootThemeState } from "../root/phi-root-theme-resolver";
import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../../theme/phi-theme-palette";
import { PhiModalControlAdapter as PhiModalControl } from "./phi-modal-control-adapter";

/**
 * Where a Modal's geometry lands, measured on the mounted adapter: the width on the dialog Ant Design
 * draws, its bounds beside it, and the height on the container (OVERLAYS.md, "Geometry").
 */
afterEach(cleanup);

/* The Modal reads the root config's motion tokens, so it renders inside a real one. */
const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const themeState = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });

function render(children: ReactNode) {
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

const VIEWPORT_INLINE = `calc(100vw - ${PHI_SPACE.base} - ${PHI_SPACE.base})`;

function dialog() {
  return document.querySelector<HTMLElement>(".ant-modal");
}

describe("the Modal's geometry", () => {
  it("is as wide as its stated size, above its floor, inside the viewport", () => {
    render(<PhiModalControl open title="Sign in" size={{ width: 420 }} minSize={{ width: 400 }} body={<p>body</p>} />);
    expect(dialog()?.style.width).toBe("420px");
    expect(dialog()?.style.minWidth).toBe(`min(400px, ${VIEWPORT_INLINE})`);
    expect(dialog()?.style.maxWidth).toBe(VIEWPORT_INLINE);
  });

  it("takes a viewport limit in vw, and the controlSize step where no width is stated", () => {
    render(<PhiModalControl open title="History" controlSize="large" maxSize={{ width: "90vw" }} body={<p>body</p>} />);
    expect(dialog()?.style.width).toBe("960px");
    expect(dialog()?.style.maxWidth).toBe(`min(90vw, ${VIEWPORT_INLINE})`);
  });

  it("lets a told width stand over the stated one", () => {
    render(<PhiModalControl open title="Edit" size={{ width: 420 }} toldSize={{ width: 640 }} body={<p>body</p>} />);
    expect(dialog()?.style.width).toBe("640px");
  });
});
