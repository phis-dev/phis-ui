import { describe, expect, it } from "vitest";

import { collectPhiVideoProviderDescriptorErrors, resolvePhiVideoAddress } from "../../../types/video";
import { PHI_VIDEO_PROVIDER_KEYS } from "./ids";
import { PHI_VIDEO_RUNTIME_MODULE_PROVIDERS } from "./providers";

/**
 * The catalog checks these descriptors when it is built, which means a bad one takes a Site down rather
 * than showing a wrong placeholder. Checking them here says so at the time somebody edits the table.
 */
describe("the Video Module's own providers", () => {
  it.each(PHI_VIDEO_RUNTIME_MODULE_PROVIDERS)("$title states a provider the registry accepts", (provider) => {
    expect(collectPhiVideoProviderDescriptorErrors(provider)).toEqual([]);
  });

  it("reads the addresses people actually paste", () => {
    const resolve = (address: string) => resolvePhiVideoAddress(PHI_VIDEO_RUNTIME_MODULE_PROVIDERS, address);

    expect(resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toMatchObject({
      videoId: "dQw4w9WgXcQ",
      provider: { key: PHI_VIDEO_PROVIDER_KEYS.youtube },
    });
    expect(resolve("https://m.youtube.com/watch?v=dQw4w9WgXcQ")?.videoId).toBe("dQw4w9WgXcQ");
    expect(resolve("https://youtu.be/dQw4w9WgXcQ?t=42")?.videoId).toBe("dQw4w9WgXcQ");
    expect(resolve("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.videoId).toBe("dQw4w9WgXcQ");
    // An address that is already the privacy-friendlier embed is still a YouTube address.
    expect(resolve("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")?.videoId).toBe("dQw4w9WgXcQ");

    expect(resolve("https://vimeo.com/347119375")).toMatchObject({
      videoId: "347119375",
      provider: { key: PHI_VIDEO_PROVIDER_KEYS.vimeo },
    });
    expect(resolve("https://player.vimeo.com/video/347119375")?.videoId).toBe("347119375");
  });

  it("takes nothing from an address that only looks like one", () => {
    const resolve = (address: string) => resolvePhiVideoAddress(PHI_VIDEO_RUNTIME_MODULE_PROVIDERS, address);

    expect(resolve("https://evil.test/https://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(resolve("https://www.youtube.com/")).toBeNull();
    expect(resolve("https://vimeo.com/channels/staffpicks")).toBeNull();
  });
});
