import assert from "node:assert/strict";
import { createElement as h } from "react";
import { prerender } from "react-dom/static";
import { StyleProvider, createCache, extractStyle } from "@ant-design/cssinjs";

import { PhiConfigProvider, usePhiConfig } from "../components/root/phi-config-provider";
import { PhiThemeToneSourceProvider } from "../components/root/phi-theme-tone-source";
import { resolvePhiRootThemeState } from "../components/root/phi-root-theme-resolver";
import { PhiSurfaceTone } from "../components/surface/phi-surface-tone";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "../theme/phi-theme-presets";
import { resolvePhiPublishedThemeCustomColors } from "../theme/phi-theme-palette";

/**
 * LAYOUTING.md, "Surface tone": a Surface draws its content in the mode its `tone` asks for, and it does
 * so on the server.
 *
 * Rendered with `prerender`, which waits for the lazily loaded scope the way the page's server render
 * does, inside a real root config with both of the Site's modes resolved. Three things have to hold:
 * the content reads the other mode's tokens in JavaScript; the other mode's variables are written under
 * the tone's class, which is what the box itself and its CSS read; and `inverse` is read against the
 * page, so an inverse Surface inside another one is the same mode and shares its variables.
 */
function Probe({ label }: { label: string }) {
  const { mode, token } = usePhiConfig();
  return h("span", { "data-probe": label }, `${mode}|${token.colorBgContainer}`);
}

const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
const siteTheme = { preset: "phis", mode: "light", shape: { controls: corners } } as never;
const state = resolvePhiRootThemeState({ siteTheme, fonts: {}, presets: PHI_CORE_THEME_PRESET_PLUGINS });
const customColorsByMode = {
  light: resolvePhiPublishedThemeCustomColors(siteTheme, "light", PHI_CORE_THEME_PRESET_PLUGINS),
  dark: resolvePhiPublishedThemeCustomColors(siteTheme, "dark", PHI_CORE_THEME_PRESET_PLUGINS),
};
const lightGround = String(state.themes.light.token.colorBgContainer);
const darkGround = String(state.themes.dark.token.colorBgContainer);
assert.notEqual(lightGround, darkGround, "The probe needs two modes that differ.");

const cache = createCache();
const { prelude } = await prerender(h(StyleProvider, {
  cache,
  children: h(PhiConfigProvider, {
    locale: undefined,
    fonts: {},
    fontFamilies: [],
    mode: "light",
    theme: state.themes.light,
    presets: PHI_CORE_THEME_PRESET_PLUGINS,
    customColors: customColorsByMode.light,
    rootClassName: "",
    rootStyle: {},
    controlShape: "rounded",
    children: h(PhiThemeToneSourceProvider, {
      value: { pageMode: "light", themes: state.themes, customColorsByMode, locale: undefined },
      children: [
        h(Probe, { key: "page", label: "page" }),
        h(PhiSurfaceTone, { key: "dark", tone: "dark", children: h(Probe, { label: "dark" }) }),
        h(PhiSurfaceTone, { key: "same", tone: "light", children: h(Probe, { label: "light-on-light" }) }),
        h(PhiSurfaceTone, {
          key: "inverse",
          tone: "inverse",
          children: [
            h(Probe, { key: "self", label: "inverse" }),
            h(PhiSurfaceTone, { key: "nested", tone: "inverse", children: h(Probe, { label: "inverse-in-inverse" }) }),
            h(PhiSurfaceTone, { key: "back", tone: "light", children: h(Probe, { label: "light-in-inverse" }) }),
          ],
        }),
      ],
    }),
  }),
}));
const html = await new Response(prelude).text();
const probes = Object.fromEntries(
  [...html.matchAll(/data-probe="([^"]+)">([^<]+)</gu)].map((match) => [match[1], match[2]]),
);
assert.deepEqual(probes, {
  "page": `light|${lightGround}`,
  "dark": `dark|${darkGround}`,
  "light-on-light": `light|${lightGround}`,
  "inverse": `dark|${darkGround}`,
  "inverse-in-inverse": `dark|${darkGround}`,
  "light-in-inverse": `light|${lightGround}`,
}, "Each Surface's content reads the tokens of the mode its tone asks for, on the server.");

const css = extractStyle(cache, true);
const variableOf = (className: string) =>
  css.match(new RegExp(`\\.${className}[^{]*\\{[^}]*--ant-color-bg-container:\\s*([^;]+);`, "u"))?.[1] ?? null;
assert.equal(variableOf("phi-tone-dark"), darkGround, "The dark tone's variables are written under its class.");
assert.equal(variableOf("phi-tone-inverse"), darkGround, "Every inverse Surface shares one set of variables.");

console.log("Surface tone contracts validated: tokens and variables follow the tone on the server.");
