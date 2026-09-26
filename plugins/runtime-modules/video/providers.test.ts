import { describe, expect, it } from "vitest";

import {
  buildPhiVideoEmbedUrl,
  collectPhiVideoProviderDescriptorErrors,
  parsePhiVideoEmbedParams,
  resolvePhiVideoAddress,
  resolvePhiVideoId,
} from "../../../types/video";
import { PHI_VIDEO_PROVIDER_KEYS } from "./ids";
import { PHI_VIDEO_RUNTIME_MODULE_PROVIDERS } from "./providers";

const YOUTUBE = PHI_VIDEO_RUNTIME_MODULE_PROVIDERS
  .find((provider) => provider.key === PHI_VIDEO_PROVIDER_KEYS.youtube)!;
const VIMEO = PHI_VIDEO_RUNTIME_MODULE_PROVIDERS
  .find((provider) => provider.key === PHI_VIDEO_PROVIDER_KEYS.vimeo)!;

/**
 * The catalog checks these descriptors when it is built, which means a bad one takes a Site down rather
 * than showing a wrong placeholder. Checking them here says so at the time somebody edits the table.
 */
describe("the Video Module's own providers", () => {
  it.each(PHI_VIDEO_RUNTIME_MODULE_PROVIDERS)("$title states a provider the registry accepts", (provider) => {
    expect(collectPhiVideoProviderDescriptorErrors(provider)).toEqual([]);
  });

  it("takes the ids people are given, and the links they paste instead", () => {
    expect(resolvePhiVideoId(YOUTUBE, "dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(resolvePhiVideoId(YOUTUBE, "https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(resolvePhiVideoId(YOUTUBE, "https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(resolvePhiVideoId(YOUTUBE, "https://youtu.be/dQw4w9WgXcQ?t=42")).toBe("dQw4w9WgXcQ");
    expect(resolvePhiVideoId(YOUTUBE, "https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    // An address that is already the privacy-friendlier embed is still a YouTube address.
    expect(resolvePhiVideoId(YOUTUBE, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"))
      .toBe("dQw4w9WgXcQ");

    expect(resolvePhiVideoId(VIMEO, "347119375")).toBe("347119375");
    expect(resolvePhiVideoId(VIMEO, "https://vimeo.com/347119375")).toBe("347119375");
    expect(resolvePhiVideoId(VIMEO, "https://player.vimeo.com/video/347119375")).toBe("347119375");
  });

  it("keeps the two providers apart, so a selected provider means what it says", () => {
    expect(resolvePhiVideoId(VIMEO, "https://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(resolvePhiVideoId(YOUTUBE, "https://vimeo.com/347119375")).toBeNull();
    // Which is exactly what lets the Builder say "that is a YouTube video, and Vimeo is selected".
    expect(resolvePhiVideoAddress(PHI_VIDEO_RUNTIME_MODULE_PROVIDERS, "https://vimeo.com/347119375"))
      .toMatchObject({ provider: { key: PHI_VIDEO_PROVIDER_KEYS.vimeo } });
  });

  it("takes nothing from an address that only looks like one", () => {
    const resolve = (address: string) => resolvePhiVideoAddress(PHI_VIDEO_RUNTIME_MODULE_PROVIDERS, address);

    expect(resolve("https://evil.test/https://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(resolve("https://www.youtube.com/")).toBeNull();
    expect(resolve("https://vimeo.com/channels/staffpicks")).toBeNull();
    // The value that rendered nothing on a live page: an id with the rest of a share link stuck to it.
    expect(resolve("6ToonaJJbRE&lc")).toBeNull();
  });

  it("sends do-not-track whatever a Site configures, and takes a start point beside it", () => {
    const { accepted, rejected } = parsePhiVideoEmbedParams(VIMEO, "dnt=0&h=3f9a1c");

    expect(rejected).toEqual([{ name: "dnt", reason: "reserved" }]);
    expect(buildPhiVideoEmbedUrl(VIMEO, "347119375", accepted))
      .toBe("https://player.vimeo.com/video/347119375?autoplay=1&dnt=1&h=3f9a1c");
    expect(buildPhiVideoEmbedUrl(YOUTUBE, "dQw4w9WgXcQ", parsePhiVideoEmbedParams(YOUTUBE, "start=90").accepted))
      .toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&start=90");
  });
});
