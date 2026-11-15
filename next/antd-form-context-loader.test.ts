import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  PHI_ANTD_FORM_CONTEXT_IMPORT,
  PHI_ANTD_FORM_CONTEXT_PATCHED_IMPORT,
  patchPhiAntdFormContext,
} from "./antd-form-context-loader.mjs";
import { readPhiAntdFormContextPatchRule } from "./config.mjs";

const packageRoot = path.resolve(import.meta.dirname, "..");
const antdRequire = createRequire(createRequire(path.join(packageRoot, "package.json")).resolve("antd/package.json"));
const antdVersion = antdRequire("./package.json").version as string;

describe("the Ant Design 6.7 Form context patch", () => {
  it("rewrites the one import of the installed Ant Design, and only that", () => {
    const source = readFileSync(antdRequire.resolve("./es/form/context.js"), "utf8");
    const patched = patchPhiAntdFormContext(source);
    if (!antdVersion.startsWith("6.7.")) {
      // The patch is for 6.7; another release is to be checked and the patch removed (TODOS.md).
      expect(readPhiAntdFormContextPatchRule(packageRoot)).toBeNull();
      return;
    }
    expect(patched).not.toBeNull();
    expect(patched).toContain(PHI_ANTD_FORM_CONTEXT_PATCHED_IMPORT);
    expect(patched).not.toContain(PHI_ANTD_FORM_CONTEXT_IMPORT);
    expect(patched!.length - source.length).toBe(
      PHI_ANTD_FORM_CONTEXT_PATCHED_IMPORT.length - PHI_ANTD_FORM_CONTEXT_IMPORT.length,
    );
  });

  it("leaves a file that reads differently alone", () => {
    expect(patchPhiAntdFormContext("import { FormProvider } from '@rc-component/form';")).toBeNull();
    expect(patchPhiAntdFormContext(`${PHI_ANTD_FORM_CONTEXT_IMPORT}\n${PHI_ANTD_FORM_CONTEXT_IMPORT}`)).toBeNull();
  });

  it("names the file it patches and the loader that does it", () => {
    const rule = readPhiAntdFormContextPatchRule(packageRoot) as Record<string, { condition: { path: RegExp }; loaders: string[] }> | null;
    if (!antdVersion.startsWith("6.7.")) return;
    const entry = rule!["context.js"]!;
    expect(entry.loaders).toEqual(["@phis/ui/next/antd-form-context-loader"]);
    expect(entry.condition.path.test("/x/node_modules/.pnpm/antd@6.7.0/node_modules/antd/es/form/context.js")).toBe(true);
    expect(entry.condition.path.test("/x/node_modules/antd/es/config-provider/context.js")).toBe(false);
  });
});
