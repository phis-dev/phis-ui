/*
 * Writes `styles/antd-static.css`: the structural CSS of every Ant Design component, generated once
 * instead of on every render.
 *
 * Ant Design emits two kinds of CSS. The structure -- `.ant-btn{padding:...;color:var(--ant-color-text)}`
 * -- reads every Theme value through a custom property, so it is the same for every Site, Theme and mode.
 * The custom properties themselves -- `.phi-root-...{--ant-color-primary:...}` -- are what a Theme
 * decides. The root runs Ant Design with `zeroRuntime`, which drops the structure from rendering and
 * keeps the properties; this file is where the structure comes from instead. Generating it at runtime
 * cost about 10 ms of CPU per page view and 40-140 KB of inline CSS per page (measured 04.10.2026).
 *
 * The file is generated here with the configuration the root renders with -- prefix `ant`, unhashed,
 * px2rem at `PHI_REM_ROOT_PX` -- so its selectors are the ones the components carry. Every component is rendered, not
 * only the ones this package uses: a Module that ships its own Ant Design component (the calendar
 * adapter) relies on the file as much as the Controls do.
 *
 *   tsx scripts/generate-antd-static-css.tsx          write the file
 *   tsx scripts/generate-antd-static-css.tsx --check  fail when the file is not what this writes
 *
 * `--check` is what catches an Ant Design upgrade: the structure changes with the version, and a file
 * from the old one would style the new components with the old rules. Generating also fails when a
 * style hook Ant Design declares was not reached -- a part registered only under some prop or token
 * that the render below does not set yet.
 */
import { globSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { createCache, extractStyle, px2remTransformer, StyleProvider } from "@ant-design/cssinjs";
import { iconStyles } from "@ant-design/icons/es/renderUtils";
import * as antd from "antd";
import { createElement, Fragment, type ComponentType, type ReactNode } from "react";
import { renderToString } from "react-dom/server";

import { PHI_REM_ROOT_PX } from "../theme/phi-css-vars";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(packageRoot, "styles", "antd-static.css");

// Components that render nothing of their own, or nothing without a context they cannot have here.
const SKIPPED = new Set(["ConfigProvider", "Grid"]);

type AnyComponent = ComponentType<Record<string, unknown>> & Record<string, unknown>;

/*
 * Components whose styles are only registered with some props, or by a part that is not rendered
 * closed. Ported from `@ant-design/static-style-extract`, which is the reference for which parts need
 * a nudge.
 */
const CUSTOM_RENDER: Record<string, (component: AnyComponent) => ReactNode> = {
  Affix: (Affix) => createElement(Affix, null, createElement("div")),
  Cascader: (Cascader) => createElement(Fragment, null,
    createElement(Cascader),
    createElement(Cascader.Panel as AnyComponent),
  ),
  // `Form.Item` brings the field-level fallback styles a bare `Form` never registers.
  Form: (Form) => createElement(Form, null,
    createElement(Form.Item as AnyComponent, { label: "Label" }, createElement(antd.Input as unknown as AnyComponent)),
  ),
  Dropdown: (Dropdown) => createElement(Dropdown, { menu: { items: [] } }, createElement("div")),
  Menu: (Menu) => createElement(Menu, { items: [] }),
  QRCode: (QRCode) => createElement(QRCode, { value: "https://phisys.com" }),
  Tree: (Tree) => createElement(Tree, { treeData: [] }),
  Tag: (Tag) => createElement(Fragment, null,
    createElement(Tag, { color: "blue" }, "Tag"),
    createElement(Tag, { color: "success" }, "Tag"),
  ),
  Badge: (Badge) => createElement(Fragment, null, createElement(Badge), createElement(Badge.Ribbon as AnyComponent)),
  Space: (Space) => createElement(Fragment, null,
    createElement(Space),
    createElement(Space.Compact as AnyComponent, null,
      createElement(antd.Button as unknown as AnyComponent),
      createElement(Space.Addon as AnyComponent, null, "1"),
    ),
  ),
  Input: (Input) => createElement(Fragment, null,
    createElement(Input),
    createElement(Input.Group as AnyComponent, null, createElement(Input), createElement(Input)),
    createElement(Input.Search as AnyComponent),
    createElement(Input.TextArea as AnyComponent),
    createElement(Input.Password as AnyComponent),
    createElement(Input.OTP as AnyComponent),
  ),
  Modal: (Modal) => createElement(Fragment, null,
    createElement(Modal),
    createElement(Modal._InternalPanelDoNotUseOrYouWillBeFired as AnyComponent),
    createElement(Modal._InternalPanelDoNotUseOrYouWillBeFired as AnyComponent, { type: "confirm" }),
  ),
  message: (message) => createElement(message._InternalPanelDoNotUseOrYouWillBeFired as AnyComponent),
  notification: (notification) => createElement(notification._InternalPanelDoNotUseOrYouWillBeFired as AnyComponent),
  Layout: (Layout) => createElement(Layout, null,
    createElement(Layout.Header as AnyComponent, null, "Header"),
    createElement(Layout.Sider as AnyComponent, null, "Sider"),
    createElement(Layout.Content as AnyComponent, null, "Content"),
    createElement(Layout.Footer as AnyComponent, null, "Footer"),
  ),
};

function renderEveryComponent() {
  const library = antd as unknown as Record<string, AnyComponent>;
  return Object.keys(library)
    .filter((name) => !SKIPPED.has(name) && (/^[A-Z]/.test(name) || name === "message" || name === "notification"))
    .sort()
    .map((name) => createElement(Fragment, { key: name },
      CUSTOM_RENDER[name] ? CUSTOM_RENDER[name](library[name]) : createElement(library[name]),
    ));
}

/*
 * The style hooks Ant Design declares, read from its sources: `genStyleHooks("Button", ...)` registers
 * under `Button-Button`, `genSubStyleComponent(["Form", "item-item"], ...)` under `Form-item-item`.
 */
function listDeclaredStyleHooks() {
  const antdRoot = path.dirname(createRequire(import.meta.url).resolve("antd/package.json"));
  const declared = new Set<string>();
  for (const file of globSync("es/**/style/*.js", { cwd: antdRoot })) {
    const source = readFileSync(path.join(antdRoot, file), "utf8");
    for (const match of source.matchAll(/gen(?:StyleHooks|ComponentStyleHook|SubStyleComponent)\((\[[^\]]*\]|'[^']*')/gu)) {
      const names = [...match[1].matchAll(/'([^']*)'/gu)].map((entry) => entry[1]);
      declared.add(match[1].startsWith("[") ? names.join("-") : `${names[0]}-${names[0]}`);
    }
  }
  return declared;
}

// Declared by Ant Design but not reachable from its exports, so no page can render it.
const UNREACHABLE_STYLE_HOOKS = new Set(["BackTop-BackTop"]);

/*
 * The link rules Ant Design shares between all its components, scoped back to them.
 *
 * Hashed, Ant Design writes them as `:where(.css-<hash>) a` and `a:where(.css-<hash>)`: a link inside
 * one of its components, or one of them. Unhashed both lose the scope and become `a` -- a colour,
 * a transition and an outline on every link of the page, the house's own included. The hash class sat
 * on every Ant Design element, as an `ant-` class does, so the scope is put back as that.
 */
const ANTD_ELEMENT = ':where([class^="ant-"],[class*=" ant-"])';
const LINK_SELECTOR = /^a(?:[:[][^\s,>+~]*)?$/u;

function scopeSharedLinkRules(css: string) {
  const seen = new Set<string>();
  return css.replace(/(?<=^|\})([^{}@]+)\{([^{}]*)\}/gu, (rule, selectorList: string, body: string) => {
    const selectors = selectorList.split(",");
    if (!selectors.every((selector) => LINK_SELECTOR.test(selector))) return rule;
    // The descendant and the self form arrive as two copies of one rule; one scoped copy covers both.
    const scoped = selectors.flatMap((selector) => [
      `${ANTD_ELEMENT} ${selector}`,
      `a${ANTD_ELEMENT}${selector.slice(1)}`,
    ]).join(",");
    if (seen.has(scoped + body)) return "";
    seen.add(scoped + body);
    return `${scoped}{${body}}`;
  });
}

export function generatePhiAntdStaticCss() {
  const cache = createCache();
  const theme = { hashed: false, cssVar: { prefix: "ant", key: "phi-static" } };
  renderToString(
    createElement(StyleProvider, {
      cache,
      transformers: [px2remTransformer({ rootValue: PHI_REM_ROOT_PX, precision: 5, mediaQuery: false })],
    },
    // Unhashed and with `cssVar`, as the root renders; the key names nothing in the structure.
    createElement(antd.ConfigProvider, { theme }, renderEveryComponent()),
    /*
     * Again with `wireframe`, which a Theme may switch on and which decides whether some parts register
     * at all (the bordered Pagination). The cache is keyed by component, not by token, so this pass
     * adds only what the first one did not reach.
     */
    createElement(antd.ConfigProvider, { theme: { ...theme, token: { wireframe: true } } }, renderEveryComponent()),
    ),
  );

  const reached = new Set(
    [...cache.cache.keys()].filter((key) => key.startsWith("style%")).map((key) => key.split("%")[2]),
  );
  const unreached = [...listDeclaredStyleHooks()]
    .filter((hook) => !reached.has(hook) && !UNREACHABLE_STYLE_HOOKS.has(hook))
    .sort();
  if (unreached.length > 0) {
    throw new Error(
      `Ant Design declares style hooks the render did not reach: ${unreached.join(", ")}. `
        + "Render the part that registers each (CUSTOM_RENDER), or name it in UNREACHABLE_STYLE_HOOKS.",
    );
  }

  const structure = scopeSharedLinkRules(extractStyle(cache, { plain: true, types: ["style"] })
    // The cache-path map tells a runtime cache what the server already rendered; nothing reads it here.
    .replace(/\.data-ant-cssinjs-cache-path\{content:"[^"]*";\}/, ""));
  const version = (createRequire(import.meta.url)("antd/package.json") as { version: string }).version;
  return [
    `/* Generated by scripts/generate-antd-static-css.tsx from antd ${version}. Do not edit. */`,
    iconStyles.trim(),
    structure,
    "",
  ].join("\n");
}

const css = generatePhiAntdStaticCss();
if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(OUTPUT, "utf8");
  } catch {
    // A missing file is a stale file.
  }
  if (current !== css) {
    console.error(
      "styles/antd-static.css is not what the installed Ant Design generates. Run `pnpm antd-css:generate`.",
    );
    process.exit(1);
  }
} else {
  writeFileSync(OUTPUT, css);
  console.log(`styles/antd-static.css: ${css.length} bytes`);
}
