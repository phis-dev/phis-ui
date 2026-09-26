import { describe, expect, it } from "vitest";

import {
  buildPhiVideoEmbedUrl,
  collectPhiVideoProviderDescriptorErrors,
  isPhiVideoProviderKey,
  parsePhiVideoEmbedParams,
  resolvePhiVideoAddress,
  resolvePhiVideoId,
  type PhiVideoProviderDescriptor,
} from "./video";

/**
 * A provider is data, so everything that keeps a placeholder honest has to be checkable here rather
 * than trusted at the call site. The three rules worth the file: a provider names who receives the
 * request, it cannot name one host and load from another, and the parameters it always sends cannot be
 * turned off from a Site's configuration.
 */
const YOUTUBE: PhiVideoProviderDescriptor = {
  key: "@phis/ui/modules/video/video-providers/youtube",
  ownerModuleId: "@phis/ui/modules/video",
  title: "YouTube",
  recipient: "Google Ireland Ltd.",
  privacyUrl: "https://policies.google.com/privacy",
  embedHostname: "www.youtube-nocookie.com",
  embedUrlTemplate: "https://www.youtube-nocookie.com/embed/{id}",
  embedParams: { autoplay: "1", rel: "0" },
  idPattern: "^[A-Za-z0-9_-]{11}$",
  idExample: "aqz-KE-bpKQ",
  addressPatterns: [
    "^https?://(?:www\\.)?youtube\\.com/watch\\?(?:.*&)?v=([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])",
    "^https?://youtu\\.be/([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])",
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

  it("refuses a query baked into the template, because such a query cannot be reserved", () => {
    const errors = collectPhiVideoProviderDescriptorErrors({
      ...YOUTUBE,
      embedUrlTemplate: "https://www.youtube-nocookie.com/embed/{id}?autoplay=1",
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("states its query as embedParams");
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

  it("insists on an id pattern anchored at both ends, and an example that pattern accepts", () => {
    expect(collectPhiVideoProviderDescriptorErrors({ ...YOUTUBE, idPattern: "[A-Za-z0-9_-]{11}" })[0])
      .toContain("anchors its id pattern");
    expect(collectPhiVideoProviderDescriptorErrors({ ...YOUTUBE, idExample: "too-short" })[0])
      .toContain("an id example its own pattern accepts");
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

  it("reports a missing field instead of throwing over it", () => {
    /*
     * The catalog validates while an Area's Modules evaluate, so a throw here is not a rejected provider
     * -- it is a Site whose whole catalog fails to load. This is the regression: an `embedParams` that was
     * not there took the Public and Builder catalogs down with `Cannot convert undefined or null to object`.
     */
    const partial = { ...YOUTUBE } as Partial<PhiVideoProviderDescriptor>;
    delete partial.embedParams;
    expect(collectPhiVideoProviderDescriptorErrors(partial as PhiVideoProviderDescriptor)[0])
      .toContain("embedParams");

    for (const field of ["title", "recipient", "embedUrlTemplate", "idPattern", "idExample", "addressPatterns"] as const) {
      const missing = { ...YOUTUBE } as Partial<PhiVideoProviderDescriptor>;
      delete missing[field];
      expect(collectPhiVideoProviderDescriptorErrors(missing as PhiVideoProviderDescriptor).length)
        .toBeGreaterThan(0);
    }

    expect(collectPhiVideoProviderDescriptorErrors(null as unknown as PhiVideoProviderDescriptor))
      .toHaveLength(1);
    expect(collectPhiVideoProviderDescriptorErrors({} as PhiVideoProviderDescriptor).length)
      .toBeGreaterThan(5);
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

describe("resolving the id of a video", () => {
  it("takes the id the provider says it takes", () => {
    expect(resolvePhiVideoId(YOUTUBE, "dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(resolvePhiVideoId(YOUTUBE, "  dQw4w9WgXcQ  ")).toBe("dQw4w9WgXcQ");
    // The shape is the provider's own, so a plausible-looking value of the wrong length is not an id.
    expect(resolvePhiVideoId(YOUTUBE, "dQw4w9W")).toBeNull();
    expect(resolvePhiVideoId(YOUTUBE, "6ToonaJJbRE&lc")).toBeNull();
  });

  it("reads a whole link too, so pasting one lands on the id instead of storing the clipboard", () => {
    expect(resolvePhiVideoId(YOUTUBE, "https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(resolvePhiVideoId(YOUTUBE, "https://youtu.be/dQw4w9WgXcQ?t=42")).toBe("dQw4w9WgXcQ");
    // A watch address carries more than the video, and the video is not always first.
    expect(resolvePhiVideoId(YOUTUBE, "https://www.youtube.com/watch?list=x&v=dQw4w9WgXcQ&t=30"))
      .toBe("dQw4w9WgXcQ");
  });

  it("resolves to nothing rather than to something, which is what keeps a stale value harmless", () => {
    expect(resolvePhiVideoId(YOUTUBE, "")).toBeNull();
    expect(resolvePhiVideoId(YOUTUBE, null)).toBeNull();
    expect(resolvePhiVideoId(YOUTUBE, "https://evil.test/?u=youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("recognising which provider a pasted address belongs to", () => {
  it("is for the Builder alone: it names the provider so the editor can say the selection is wrong", () => {
    expect(resolvePhiVideoAddress([YOUTUBE], "https://youtu.be/dQw4w9WgXcQ"))
      .toEqual({ provider: YOUTUBE, videoId: "dQw4w9WgXcQ" });
    expect(resolvePhiVideoAddress([], "https://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(resolvePhiVideoAddress([YOUTUBE], "https://evil.test/https://youtu.be/dQw4w9WgXcQ")).toBeNull();
  });
});

describe("a Site's own playback parameters", () => {
  it("takes what the provider does not already send", () => {
    expect(parsePhiVideoEmbedParams(YOUTUBE, "start=90")).toEqual({
      accepted: [["start", "90"]],
      rejected: [],
    });
    expect(parsePhiVideoEmbedParams(YOUTUBE, "?start=90&cc_load_policy=1").accepted)
      .toEqual([["start", "90"], ["cc_load_policy", "1"]]);
  });

  it("refuses the keys the provider always sends, so nobody turns off do-not-track from a field", () => {
    expect(parsePhiVideoEmbedParams(YOUTUBE, "rel=1&autoplay=0")).toEqual({
      accepted: [],
      rejected: [{ name: "rel", reason: "reserved" }, { name: "autoplay", reason: "reserved" }],
    });
  });

  it("names what it dropped and why, rather than dropping it quietly", () => {
    expect(parsePhiVideoEmbedParams(YOUTUBE, "sp ce=1").rejected).toEqual([{ name: "sp ce", reason: "name" }]);
    expect(parsePhiVideoEmbedParams(YOUTUBE, `h=${"a".repeat(200)}`).rejected)
      .toEqual([{ name: "h", reason: "value" }]);

    const many = Array.from({ length: 10 }, (_, index) => `p${index}=1`).join("&");
    const parsed = parsePhiVideoEmbedParams(YOUTUBE, many);
    expect(parsed.accepted).toHaveLength(8);
    expect(parsed.rejected).toEqual([
      { name: "p8", reason: "count" },
      { name: "p9", reason: "count" },
    ]);
  });

  it("reads the query and only the query, so a fragment is not smuggled in as a parameter", () => {
    expect(parsePhiVideoEmbedParams(YOUTUBE, "#t=1m30s").rejected).toEqual([{ name: "#t", reason: "name" }]);
    expect(parsePhiVideoEmbedParams(YOUTUBE, "").accepted).toEqual([]);
    expect(parsePhiVideoEmbedParams(YOUTUBE, null).accepted).toEqual([]);
  });
});

describe("building the player address", () => {
  it("puts the video in the path encoded, because it came from a person", () => {
    expect(buildPhiVideoEmbedUrl(YOUTUBE, "dQw4w9WgXcQ"))
      .toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0");
    expect(buildPhiVideoEmbedUrl(YOUTUBE, "a/../b?x=1"))
      .toBe("https://www.youtube-nocookie.com/embed/a%2F..%2Fb%3Fx%3D1?autoplay=1&rel=0");
  });

  it("adds a Site's parameters after the provider's, and never over them", () => {
    expect(buildPhiVideoEmbedUrl(YOUTUBE, "dQw4w9WgXcQ", [["start", "90"]]))
      .toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&start=90");
    // Belt as well as braces: the parse refuses a reserved key, and so does the build.
    expect(buildPhiVideoEmbedUrl(YOUTUBE, "dQw4w9WgXcQ", [["autoplay", "0"]]))
      .toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0");
  });
});
