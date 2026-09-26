import { describe, expect, it } from "vitest";

import {
  buildPhiVideoEmbedUrl,
  collectPhiVideoProviderDescriptorErrors,
  isPhiVideoProviderKey,
  resolvePhiVideoAddress,
  type PhiVideoProviderDescriptor,
} from "./video";

/**
 * A provider is data, so everything that keeps a placeholder honest has to be checkable here rather
 * than trusted at the call site. The two rules worth the file: a provider names who receives the
 * request, and it cannot name one host and load from another.
 */
const YOUTUBE: PhiVideoProviderDescriptor = {
  key: "@phis/ui/modules/video/video-providers/youtube",
  ownerModuleId: "@phis/ui/modules/video",
  title: "YouTube",
  recipient: "Google Ireland Ltd.",
  privacyUrl: "https://policies.google.com/privacy",
  embedHostname: "www.youtube-nocookie.com",
  embedUrlTemplate: "https://www.youtube-nocookie.com/embed/{id}?autoplay=1&rel=0",
  addressPatterns: [
    "^https?://(?:www\\.)?youtube\\.com/watch\\?(?:.*&)?v=([A-Za-z0-9_-]{6,20})",
    "^https?://youtu\\.be/([A-Za-z0-9_-]{6,20})",
  ],
  aspectRatio: 16 / 9,
};

describe("video provider keys", () => {
  it("takes a first-party and an add-on key, and nothing else", () => {
    expect(isPhiVideoProviderKey("@phis/ui/modules/video/video-providers/youtube")).toBe(true);
    expect(isPhiVideoProviderKey("@acme/players/modules/wistia/video-providers/wistia")).toBe(true);
    expect(isPhiVideoProviderKey("@acme/players/video-providers/wistia")).toBe(true);
    // The namespace is the point: a key in some other namespace is not a provider.
    expect(isPhiVideoProviderKey("@phis/ui/modules/video/calendars/youtube")).toBe(false);
    expect(isPhiVideoProviderKey("youtube")).toBe(false);
  });
});

describe("video provider descriptors", () => {
  it("accepts a provider that names its recipient and embeds from the host it declared", () => {
    expect(collectPhiVideoProviderDescriptorErrors(YOUTUBE)).toEqual([]);
  });

  it("refuses a provider with nobody to name", () => {
    const errors = collectPhiVideoProviderDescriptorErrors({ ...YOUTUBE, recipient: "  " });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("names the recipient");
  });

  it("refuses a provider that embeds from a host other than the one it declared", () => {
    const errors = collectPhiVideoProviderDescriptorErrors({
      ...YOUTUBE,
      embedUrlTemplate: "https://www.youtube.com/embed/{id}",
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("while naming");
  });

  it("refuses http, a missing privacy address, and a template with no video in it", () => {
    expect(collectPhiVideoProviderDescriptorErrors({
      ...YOUTUBE,
      embedUrlTemplate: "http://www.youtube-nocookie.com/embed/{id}",
    })).toHaveLength(1);
    expect(collectPhiVideoProviderDescriptorErrors({ ...YOUTUBE, privacyUrl: "" })).toHaveLength(1);
    expect(collectPhiVideoProviderDescriptorErrors({
      ...YOUTUBE,
      embedUrlTemplate: "https://www.youtube-nocookie.com/embed/fixed",
    })).toHaveLength(1);
  });

  it("refuses an unanchored pattern, because it would read an id out of somebody else's address", () => {
    const errors = collectPhiVideoProviderDescriptorErrors({
      ...YOUTUBE,
      addressPatterns: ["youtube\\.com/watch\\?v=([A-Za-z0-9_-]+)"],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("anchors its patterns");
  });

  it("insists on exactly one capture group, and survives a pattern that is not one", () => {
    expect(collectPhiVideoProviderDescriptorErrors({
      ...YOUTUBE,
      addressPatterns: ["^https://x\\.test/(a)(b)"],
    })[0]).toContain("exactly one group");
    expect(collectPhiVideoProviderDescriptorErrors({
      ...YOUTUBE,
      addressPatterns: ["^https://x\\.test/([a-"],
    })[0]).toContain("not a regular expression");
  });

  it("reports everything at once rather than one thing per run", () => {
    expect(collectPhiVideoProviderDescriptorErrors({
      ...YOUTUBE,
      title: "",
      recipient: "",
      privacyUrl: "not a url",
      aspectRatio: 0,
    })).toHaveLength(4);
  });
});

describe("resolving an address", () => {
  it("lets the address name the provider, so pasting a link is the whole act", () => {
    expect(resolvePhiVideoAddress([YOUTUBE], "https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
      .toEqual({ provider: YOUTUBE, videoId: "dQw4w9WgXcQ" });
    expect(resolvePhiVideoAddress([YOUTUBE], "https://youtu.be/dQw4w9WgXcQ")?.videoId)
      .toBe("dQw4w9WgXcQ");
    // A watch address carries more than the video, and the video is not always first.
    expect(resolvePhiVideoAddress([YOUTUBE], "https://www.youtube.com/watch?list=x&v=dQw4w9WgXcQ&t=30")?.videoId)
      .toBe("dQw4w9WgXcQ");
  });

  it("takes a bare id only from somebody who said which provider it belongs to", () => {
    expect(resolvePhiVideoAddress([YOUTUBE], "dQw4w9WgXcQ")).toBeNull();
    expect(resolvePhiVideoAddress([YOUTUBE], "dQw4w9WgXcQ", YOUTUBE.key)?.videoId).toBe("dQw4w9WgXcQ");
    // A key nothing active owns resolves to nothing rather than to a guess.
    expect(resolvePhiVideoAddress([YOUTUBE], "dQw4w9WgXcQ", "@acme/x/video-providers/wistia")).toBeNull();
  });

  it("resolves to nothing rather than to something, which is what keeps a stale value harmless", () => {
    expect(resolvePhiVideoAddress([YOUTUBE], "")).toBeNull();
    expect(resolvePhiVideoAddress([YOUTUBE], null)).toBeNull();
    expect(resolvePhiVideoAddress([], "https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(resolvePhiVideoAddress([YOUTUBE], "https://evil.test/?u=youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("building the player address", () => {
  it("substitutes the video and encodes it, because it came from a person", () => {
    expect(buildPhiVideoEmbedUrl(YOUTUBE, "dQw4w9WgXcQ"))
      .toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0");
    expect(buildPhiVideoEmbedUrl(YOUTUBE, "a/../b?x=1"))
      .toBe("https://www.youtube-nocookie.com/embed/a%2F..%2Fb%3Fx%3D1?autoplay=1&rel=0");
  });
});
