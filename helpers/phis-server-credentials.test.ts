import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readPhiServerApiCredentials } from "./phis-server-credentials";

describe("readPhiServerApiCredentials", () => {
  let root: string;
  let cwd: ReturnType<typeof vi.spyOn>;

  const writeConfig = (phis: Record<string, unknown>, mtimeSeconds: number) => {
    const file = path.join(root, "config", "site-runtime.json");
    writeFileSync(file, JSON.stringify({ site: { key: "credentials" }, phis }));
    utimesSync(file, mtimeSeconds, mtimeSeconds);
  };

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "phis-credentials-"));
    mkdirSync(path.join(root, "config"));
    cwd = vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cwd.mockRestore();
    rmSync(root, { recursive: true, force: true });
  });

  it("reads the Site's own configuration, normalised, and reads it again only once it changed", () => {
    vi.setSystemTime(10_000);
    writeConfig({ apiBaseUrl: " http://phis.local:3101/ ", internalToken: " first " }, 1_000);
    expect(readPhiServerApiCredentials()).toEqual({ apiBaseUrl: "http://phis.local:3101", internalToken: "first" });

    // Rewritten within the recheck window: the cached answer stands.
    writeConfig({ apiBaseUrl: "http://phis.local:3101", internalToken: "second" }, 2_000);
    expect(readPhiServerApiCredentials().internalToken).toBe("first");

    // After it, the changed file is read.
    vi.setSystemTime(12_000);
    expect(readPhiServerApiCredentials().internalToken).toBe("second");
  });

  it("names the missing file instead of answering empty credentials", () => {
    vi.setSystemTime(100_000);
    expect(() => readPhiServerApiCredentials()).toThrow(/Missing config\/site-runtime\.json/);
  });
});
