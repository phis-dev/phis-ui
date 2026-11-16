import { describe, expect, it } from "vitest";

import { readPhiRuntimeModulePackageName } from "./module-identity";

describe("readPhiRuntimeModulePackageName", () => {
  it("is the first two path segments", () => {
    expect(readPhiRuntimeModulePackageName("@phis/phisys/modules/site")).toBe("@phis/phisys");
    expect(readPhiRuntimeModulePackageName("@phis/ui/modules/dashboard")).toBe("@phis/ui");
  });

  it("refuses what is not a runtime module id", () => {
    expect(() => readPhiRuntimeModulePackageName("@phis/phisys")).toThrow();
    expect(() => readPhiRuntimeModulePackageName("")).toThrow();
  });
});
