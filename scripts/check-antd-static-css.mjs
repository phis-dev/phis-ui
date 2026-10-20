import path from "node:path";
import { fileURLToPath } from "node:url";

import { generatePhiAntdStaticCss } from "../next/config.mjs";

/*
 * Generates Ant Design's structure from this package's own Ant Design, the way a Site's `next.config`
 * does from its, and fails as a Site's build would: when a style hook Ant Design declares was not
 * reached. Nothing is written -- the package ships no copy. An Ant Design upgrade that adds a part the
 * render does not reach is caught here, before a Site meets it.
 */
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { versions, css } = generatePhiAntdStaticCss(packageRoot);
console.log(`Ant Design ${versions.antd} static structure: every style hook reached, ${css.length} bytes.`);
