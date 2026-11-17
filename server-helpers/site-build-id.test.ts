import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPhiSiteBuildId, readPhiSiteBuildId } from "./site-build-id";

const missing = () => {
  throw Object.assign(new Error("no such file"), { code: "ENOENT" });
};

describe("readPhiSiteBuildId", () => {
  it("returns the trimmed content of BUILD_ID in the given directory", () => {
    const readFile = vi.fn(() => "OQF9YHNQF81YLqk-X3mB9\n");
    expect(readPhiSiteBuildId({ directory: "/site/.next", readFile })).toBe("OQF9YHNQF81YLqk-X3mB9");
    expect(readFile).toHaveBeenCalledWith("/site/.next/BUILD_ID");
  });

  it("makes an id without error when the file is missing", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const id = readPhiSiteBuildId({ directory: "/none", readFile: missing });
    expect(id).toMatch(/^process-/);
    expect(readPhiSiteBuildId({ directory: "/none", readFile: missing })).not.toBe(id);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("logs other read errors and falls back", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const id = readPhiSiteBuildId({
      directory: "/site/.next",
      readFile: () => {
        throw Object.assign(new Error("denied"), { code: "EACCES" });
      },
    });
    expect(id).toMatch(/^process-/);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("treats an empty file as missing", () => {
    expect(readPhiSiteBuildId({ directory: "/site/.next", readFile: () => " \n" })).toMatch(/^process-/);
  });
});

describe("getPhiSiteBuildId", () => {
  it("is stable within the process", () => {
    expect(getPhiSiteBuildId()).toBe(getPhiSiteBuildId());
  });
});
