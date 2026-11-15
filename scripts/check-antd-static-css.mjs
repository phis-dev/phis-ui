import path from "node:path";
import { fileURLToPath } from "node:url";

import { generatePhiAntdStaticCss } from "../next/config.mjs";
import { PHI_HAND_SET_CSS_VARIABLE_FAMILIES } from "./lib/css-variable-families.mjs";

/*
 * Generates Ant Design's structure from this package's own Ant Design, the way a Site's `next.config`
 * does from its, and fails as a Site's build would: when a style hook Ant Design declares was not
 * reached. Nothing is written -- the package ships no copy. An Ant Design upgrade that adds a part the
 * render does not reach is caught here, before a Site meets it.
 */
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { versions, css } = generatePhiAntdStaticCss(packageRoot);
console.log(`Ant Design ${versions.antd} static structure: every style hook reached, ${css.length} bytes.`);

/*
 * Ant Design writes its variables under the house's prefix (`--phi-`), beside the ones this package sets
 * by hand. Those are stated by family in `scripts/lib/css-variable-families.mjs`; a family Ant Design
 * starts to use would have two writers on one name, and the one nearer the element would silently win.
 */
const families = PHI_HAND_SET_CSS_VARIABLE_FAMILIES;
const antdVariables = new Set([...css.matchAll(/--phi-[a-z0-9]+(?:-[a-z0-9]+)*/gu)].map((entry) => entry[0].slice("--phi-".length)));
const crossings = [...antdVariables].flatMap((name) => {
  const family = families.find((entry) => name === entry || name.startsWith(`${entry}-`));
  return family ? [`--phi-${name} (family ${family})`] : [];
});
if (crossings.length > 0) {
  console.error(
    `Ant Design ${versions.antd} writes variables in families this package sets by hand: ${crossings.join(", ")}. `
      + "Rename the hand-set family or narrow it in scripts/lib/css-variable-families.mjs.",
  );
  process.exit(1);
}
console.log(`No Ant Design variable falls in the ${families.length} hand-set families.`);
