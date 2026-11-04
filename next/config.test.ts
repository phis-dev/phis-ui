import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PHI_REM_ROOT_PX } from "../theme/phi-css-vars";
import { PHI_ANTD_STATIC_CSS, PHI_ANTD_STATIC_REM_ROOT_PX, readPhiSitePublicHost, withPhiNextConfig } from "./config.mjs";

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

  // A host missing from `allowedDevOrigins` gets HTML that never hydrates; the Site's own host is read,
  // not listed by hand.
  it("allows the Site's public host to reach the dev server, beside the hosts the Site lists", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "phis-next-config-"));
    expect(readPhiSitePublicHost(dir)).toBeNull();
    mkdirSync(path.join(dir, "config"));
    writeFileSync(path.join(dir, "config", "site-runtime.json"), JSON.stringify({ site: { key: "x", publicUrl: "https://dev.example.test" } }));
    expect(readPhiSitePublicHost(dir)).toBe("dev.example.test");
    writeFileSync(path.join(dir, "config", "site-runtime.json"), JSON.stringify({ site: { key: "x", publicUrl: 42 } }));
    expect(() => readPhiSitePublicHost(dir)).toThrow(/site.publicUrl must be a URL/u);
  });

  it("merges the public host into the Site's allowedDevOrigins", () => {
    const config = withPhiNextConfig(
      { allowedDevOrigins: ["localhost", "dev.phis.dev"] },
      { dir: process.cwd() },
    );
    expect(config.allowedDevOrigins).toEqual(expect.arrayContaining(["localhost", "dev.phis.dev"]));
  }, 60_000);
});
