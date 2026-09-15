import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readPhiServerApiCredentials } from "./phis-server-credentials";

describe("readPhiServerApiCredentials", () => {
  let root: string;
  let cwd: ReturnType<typeof vi.spyOn>;

  const writeConfig = (phis: Record<string, unknown>) => {
    writeFileSync(path.join(root, "config", "site-runtime.json"), JSON.stringify({ site: { key: "credentials" }, phis }));
  };

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "phis-credentials-"));
    mkdirSync(path.join(root, "config"));
    cwd = vi.spyOn(process, "cwd").mockReturnValue(root);
  });

  afterEach(() => {
    cwd.mockRestore();
    rmSync(root, { recursive: true, force: true });
  });

  it("reads the Site's own configuration once, normalised, and keeps it for the process", () => {
    writeConfig({ apiBaseUrl: " http://phis.local:3101/ ", internalToken: " first " });
    expect(readPhiServerApiCredentials()).toEqual({ apiBaseUrl: "http://phis.local:3101", internalToken: "first" });

    // A rewritten file is not noticed: a changed token takes effect when the Site restarts.
    writeConfig({ apiBaseUrl: "http://phis.local:3101", internalToken: "second" });
    expect(readPhiServerApiCredentials().internalToken).toBe("first");
  });

  it("names the missing file instead of answering empty credentials", () => {
    expect(() => readPhiServerApiCredentials()).toThrow(/Missing config\/site-runtime\.json/);
  });
});
