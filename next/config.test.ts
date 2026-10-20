import { describe, expect, it } from "vitest";

import { PHI_REM_ROOT_PX } from "../theme/phi-css-vars";
import { PHI_ANTD_STATIC_CSS, PHI_ANTD_STATIC_REM_ROOT_PX, withPhiNextConfig } from "./config.mjs";

describe("the Site's next.config", () => {
  // Plain JavaScript cannot import the TypeScript constant; a structure converted at another root would
  // size the Controls apart from everything this package converts itself.
  it("converts Ant Design's structure at the root every other length uses", () => {
    expect(PHI_ANTD_STATIC_REM_ROOT_PX).toBe(PHI_REM_ROOT_PX);
  });

  it("points the structure's specifier at the generated file and keeps the Site's own aliases", () => {
    const config = withPhiNextConfig(
      { reactStrictMode: true, turbopack: { root: "/srv", resolveAlias: { "@site/x": "./x.ts" } } },
      { dir: process.cwd() },
    );

    expect(config.reactStrictMode).toBe(true);
    expect(config.turbopack.root).toBe("/srv");
    expect(config.turbopack.resolveAlias["@site/x"]).toBe("./x.ts");
    expect(config.turbopack.resolveAlias[PHI_ANTD_STATIC_CSS]).toMatch(/node_modules\/\.cache\/phis-ui\/antd-static-.*\.css$/u);
  }, 60_000);
});
