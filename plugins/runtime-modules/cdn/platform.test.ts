import { describe, expect, it } from "vitest";
import { PhisCdnFileArch, PhisCdnFileOs } from "@phis/contracts/addon";

import {
  guessPhiCdnPlatform,
  readPhiCdnPlatformTags,
  writePhiCdnArchBits,
  writePhiCdnOsBits,
} from "./platform";
import { formatPhiCdnBytes } from "./bytes";

describe("a CDN file's platform", () => {
  it.each([
    ["PhiVoice-1.2.0.dmg", PhisCdnFileOs.MacOS, 0],
    ["PhiVoice-1.2.0.pkg", PhisCdnFileOs.MacOS, 0],
    ["setup-x86_64.exe", PhisCdnFileOs.Windows, PhisCdnFileArch.X64],
    ["tool-arm64.msi", PhisCdnFileOs.Windows, PhisCdnFileArch.Arm64],
    ["phis_0.4.9-1+trixie_amd64.deb", PhisCdnFileOs.Linux, PhisCdnFileArch.X64],
    ["phis-0.4.9-1.aarch64.rpm", PhisCdnFileOs.Linux, PhisCdnFileArch.Arm64],
    ["app-release.apk", PhisCdnFileOs.Android, 0],
    ["notes.txt", 0, 0],
    ["farm64ers.zip", 0, 0],
    ["universal-amd64-arm64.tar.gz", 0, PhisCdnFileArch.X64 | PhisCdnFileArch.Arm64],
  ])("is guessed from %s", (fileName, os, arch) => {
    expect(guessPhiCdnPlatform(fileName)).toEqual({ os, arch });
  });

  it("reads and writes the contract's bits by word", () => {
    expect(readPhiCdnPlatformTags(PhisCdnFileOs.Linux | PhisCdnFileOs.Other, PhisCdnFileArch.RiscV64))
      .toEqual(["linux", "other", "riscv64"]);
    expect(writePhiCdnOsBits(["macos", "ios", "unknown"])).toBe(PhisCdnFileOs.MacOS | PhisCdnFileOs.IOS);
    expect(writePhiCdnArchBits(["x64", "arm32"])).toBe(PhisCdnFileArch.X64 | PhisCdnFileArch.Arm32);
  });

  it("states sizes in binary units", () => {
    expect(formatPhiCdnBytes(512, "en")).toBe("512 B");
    expect(formatPhiCdnBytes(17 * 1024 * 1024 + 512 * 1024, "en")).toBe("17.5 MiB");
    expect(formatPhiCdnBytes(1536, "de")).toBe("1,5 KiB");
  });
});
