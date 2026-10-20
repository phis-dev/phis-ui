/**
 * What a Site's `next.config` takes from this package: the structural CSS of every Ant Design component,
 * generated from the Ant Design the Site has installed.
 *
 * Ant Design emits two kinds of CSS. The structure -- `.ant-btn{padding:...;color:var(--ant-color-text)}`
 * -- reads every Theme value through a custom property, so it is the same for every Site, Theme and mode.
 * The custom properties themselves -- `.phi-root-...{--ant-color-primary:...}` -- are what a Theme
 * decides. The root runs Ant Design with `zeroRuntime`, which drops the structure from rendering and
 * keeps the properties; this file is where the structure comes from instead. Generating it at runtime
 * cost about 10 ms of CPU per page view and 40-140 KB of inline CSS per page (measured 04.10.2026).
 *
 * The structure changes with the Ant Design version, so it is generated where that version is decided:
 * in the Site, when its `next.config` is read, once per version. The package ships no copy, and a Site
 * updates Ant Design within the peer range without waiting for a release of this package. The root
 * layout imports `@phis/ui/antd-static.css`, which names no file; `withPhiNextConfig` points it at the
 * one generated here.
 *
 * Generated with the configuration the root renders with -- prefix `ant`, unhashed, px2rem at
 * `PHI_ANTD_STATIC_REM_ROOT_PX` -- so its selectors are the ones the components carry. Every component
 * is rendered, not only the ones this package uses: a Module that ships its own Ant Design component
 * (the calendar adapter) relies on the file as much as the Controls do. Generating fails when a style
 * hook Ant Design declares was not reached -- a part registered only under some prop or token that the
 * render below does not set yet -- and with it the Site's build: a file missing a part would style that
 * part with nothing.
 *
 * Plain JavaScript, because Next reads `next.config` outside any bundler.
 */

import { createHash } from "node:crypto";
import { existsSync, globSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The specifier the root layout imports the structure by. */
export const PHI_ANTD_STATIC_CSS = "@phis/ui/antd-static.css";

/** The root font size the structure's px are converted against; `PHI_REM_ROOT_PX` in `theme/phi-css-vars.ts`. */
export const PHI_ANTD_STATIC_REM_ROOT_PX = 16;

// Components that render nothing of their own, or nothing without a context they cannot have here.
const SKIPPED = new Set(["ConfigProvider", "Grid"]);

// Declared by Ant Design but not reachable from its exports, so no page can render it.
const UNREACHABLE_STYLE_HOOKS = new Set(["BackTop-BackTop"]);

/*
 * Components whose styles are only registered with some props, or by a part that is not rendered
 * closed. Ported from `@ant-design/static-style-extract`, which is the reference for which parts need
 * a nudge.
 */
function customRenders(antd, h, Fragment) {
  return {
    Affix: (Affix) => h(Affix, null, h("div")),
    Cascader: (Cascader) => h(Fragment, null, h(Cascader), h(Cascader.Panel)),
    // `Form.Item` brings the field-level fallback styles a bare `Form` never registers.
    Form: (Form) => h(Form, null, h(Form.Item, { label: "Label" }, h(antd.Input))),
    Dropdown: (Dropdown) => h(Dropdown, { menu: { items: [] } }, h("div")),
    Menu: (Menu) => h(Menu, { items: [] }),
    QRCode: (QRCode) => h(QRCode, { value: "https://phisys.com" }),
    Tree: (Tree) => h(Tree, { treeData: [] }),
    Tag: (Tag) => h(Fragment, null, h(Tag, { color: "blue" }, "Tag"), h(Tag, { color: "success" }, "Tag")),
    Badge: (Badge) => h(Fragment, null, h(Badge), h(Badge.Ribbon)),
    Space: (Space) => h(Fragment, null,
      h(Space),
      h(Space.Compact, null, h(antd.Button), h(Space.Addon, null, "1")),
    ),
    Input: (Input) => h(Fragment, null,
      h(Input),
      h(Input.Group, null, h(Input), h(Input)),
      h(Input.Search),
      h(Input.TextArea),
      h(Input.Password),
      h(Input.OTP),
    ),
    Modal: (Modal) => h(Fragment, null,
      h(Modal),
      h(Modal._InternalPanelDoNotUseOrYouWillBeFired),
      h(Modal._InternalPanelDoNotUseOrYouWillBeFired, { type: "confirm" }),
    ),
    message: (message) => h(message._InternalPanelDoNotUseOrYouWillBeFired),
    notification: (notification) => h(notification._InternalPanelDoNotUseOrYouWillBeFired),
    Layout: (Layout) => h(Layout, null,
      h(Layout.Header, null, "Header"),
      h(Layout.Sider, null, "Sider"),
      h(Layout.Content, null, "Content"),
      h(Layout.Footer, null, "Footer"),
    ),
  };
}

/*
 * What the structure is generated from, resolved from the Site: its Ant Design, and the React and
 * CSS-in-JS that Ant Design itself resolves. A second copy of either would leave the render registering
 * its styles in a cache nobody reads.
 */
function resolveSiteAntd(projectDir) {
  const siteRequire = createRequire(path.join(projectDir, "package.json"));
  const antdManifest = siteRequire.resolve("antd/package.json");
  const antdRequire = createRequire(antdManifest);
  const iconsRequire = createRequire(siteRequire.resolve("@ant-design/icons/package.json"));
  return {
    antdRoot: path.dirname(antdManifest),
    antd: antdRequire("./lib/index.js"),
    cssinjs: antdRequire("@ant-design/cssinjs"),
    react: antdRequire("react"),
    renderToString: antdRequire("react-dom/server").renderToString,
    iconStyles: iconsRequire("./lib/renderUtils.js").iconStyles,
    versions: {
      antd: antdRequire("./package.json").version,
      cssinjs: antdRequire("@ant-design/cssinjs/package.json").version,
      icons: iconsRequire("./package.json").version,
    },
  };
}

function renderEveryComponent(antd, h, Fragment) {
  const custom = customRenders(antd, h, Fragment);
  return Object.keys(antd)
    .filter((name) => !SKIPPED.has(name) && (/^[A-Z]/.test(name) || name === "message" || name === "notification"))
    .sort()
    .map((name) => h(Fragment, { key: name }, custom[name] ? custom[name](antd[name]) : h(antd[name])));
}

/*
 * The style hooks Ant Design declares, read from its sources: `genStyleHooks("Button", ...)` registers
 * under `Button-Button`, `genSubStyleComponent(["Form", "item-item"], ...)` under `Form-item-item`.
 */
function listDeclaredStyleHooks(antdRoot) {
  const declared = new Set();
  for (const file of globSync("es/**/style/*.js", { cwd: antdRoot })) {
    const source = readFileSync(path.join(antdRoot, file), "utf8");
    for (const match of source.matchAll(/gen(?:StyleHooks|ComponentStyleHook|SubStyleComponent)\((\[[^\]]*\]|'[^']*')/gu)) {
      const names = [...match[1].matchAll(/'([^']*)'/gu)].map((entry) => entry[1]);
      declared.add(match[1].startsWith("[") ? names.join("-") : `${names[0]}-${names[0]}`);
    }
  }
  return declared;
}

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

function scopeSharedLinkRules(css) {
  const seen = new Set();
  return css.replace(/(?<=^|\})([^{}@]+)\{([^{}]*)\}/gu, (rule, selectorList, body) => {
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

/*
 * Every component is rendered, the deprecated ones included, and in development Ant Design says so once
 * per component on `console.error`. Those are about the render here, not about the Site.
 */
function withoutDeprecationNotices(render) {
  const reportError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === "string" && args[0].startsWith("Warning: [antd:")) return;
    reportError(...args);
  };
  try {
    return render();
  } finally {
    console.error = reportError;
  }
}

/** The structural CSS of every Ant Design component, from the Ant Design installed for `projectDir`. */
export function generatePhiAntdStaticCss(projectDir = process.cwd()) {
  const site = resolveSiteAntd(projectDir);
  const { antd, react } = site;
  const h = react.createElement;
  const { createCache, extractStyle, px2remTransformer, StyleProvider } = site.cssinjs;
  const cache = createCache();
  const theme = { hashed: false, cssVar: { prefix: "ant", key: "phi-static" } };
  withoutDeprecationNotices(() => site.renderToString(
    h(StyleProvider, {
      cache,
      transformers: [px2remTransformer({ rootValue: PHI_ANTD_STATIC_REM_ROOT_PX, precision: 5, mediaQuery: false })],
    },
    // Unhashed and with `cssVar`, as the root renders; the key names nothing in the structure.
    h(antd.ConfigProvider, { theme }, renderEveryComponent(antd, h, react.Fragment)),
    /*
     * Again with `wireframe`, which a Theme may switch on and which decides whether some parts register
     * at all (the bordered Pagination). The cache is keyed by component, not by token, so this pass
     * adds only what the first one did not reach.
     */
    h(antd.ConfigProvider, { theme: { ...theme, token: { wireframe: true } } }, renderEveryComponent(antd, h, react.Fragment)),
    ),
  ));

  const reached = new Set(
    [...cache.cache.keys()].filter((key) => key.startsWith("style%")).map((key) => key.split("%")[2]),
  );
  const unreached = [...listDeclaredStyleHooks(site.antdRoot)]
    .filter((hook) => !reached.has(hook) && !UNREACHABLE_STYLE_HOOKS.has(hook))
    .sort();
  if (unreached.length > 0) {
    throw new Error(
      `Ant Design ${site.versions.antd} declares style hooks the @phis/ui render did not reach: ${unreached.join(", ")}. `
        + "Render the part that registers each (customRenders in @phis/ui/next/config), or name it in UNREACHABLE_STYLE_HOOKS.",
    );
  }

  const structure = scopeSharedLinkRules(extractStyle(cache, { plain: true, types: ["style"] })
    // The cache-path map tells a runtime cache what the server already rendered; nothing reads it here.
    .replace(/\.data-ant-cssinjs-cache-path\{content:"[^"]*";\}/, ""));
  return {
    versions: site.versions,
    css: [
      `/* Generated by @phis/ui/next/config from antd ${site.versions.antd}. Do not edit. */`,
      site.iconStyles.trim(),
      structure,
      "",
    ].join("\n"),
  };
}

/*
 * The generated file, written once per input. Its name carries what decides its content -- the three
 * packages it is generated from and this module -- so a Site that updates any of them gets a new file,
 * and a `next.config` read again, in another worker or on the next start, finds the one it wrote.
 */
export function ensurePhiAntdStaticCss(projectDir = process.cwd()) {
  const site = resolveSiteAntd(projectDir);
  const key = createHash("sha256")
    .update(JSON.stringify(site.versions))
    .update(readFileSync(fileURLToPath(import.meta.url)))
    .digest("hex")
    .slice(0, 16);
  const directory = path.join(projectDir, "node_modules", ".cache", "phis-ui");
  const file = path.join(directory, `antd-static-${site.versions.antd}-${key}.css`);
  if (existsSync(file)) return file;
  const { css } = generatePhiAntdStaticCss(projectDir);
  mkdirSync(directory, { recursive: true });
  // Renamed into place, so a worker reading the config at the same moment sees the whole file or none.
  const pending = `${file}.${process.pid}.tmp`;
  writeFileSync(pending, css);
  renameSync(pending, file);
  return file;
}

/**
 * A Site's `next.config`, with `@phis/ui/antd-static.css` resolved to the structure generated for its
 * Ant Design. `dir` is the Site's root, the directory its `package.json` is in.
 */
export function withPhiNextConfig(nextConfig, { dir = process.cwd() } = {}) {
  // Turbopack takes no absolute path as an alias target; a relative one is read from the Site's root.
  const file = `./${path.relative(dir, ensurePhiAntdStaticCss(dir)).split(path.sep).join("/")}`;
  return {
    ...nextConfig,
    turbopack: {
      ...nextConfig.turbopack,
      resolveAlias: {
        ...nextConfig.turbopack?.resolveAlias,
        [PHI_ANTD_STATIC_CSS]: file,
      },
    },
  };
}
