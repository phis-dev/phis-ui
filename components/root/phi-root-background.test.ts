import { describe, expect, it } from "vitest";

import {
  resolvePhiRootBackgroundFrameStyle,
  resolvePhiRootBackgroundMotion,
  resolvePhiRootBackgroundPicture,
} from "./phi-root-background";

/**
 * The layer owns the page ground: unconfigured it must paint exactly the bgLayout fallback the
 * `.ant-app` rule used to paint, and a configured mode must win over that fallback.
 */
describe("root background layer style", () => {
  it("falls back to the layout background when nothing is configured", () => {
    const style = resolvePhiRootBackgroundFrameStyle();
    expect(style.backgroundColor).toBe("var(--ant-color-bg-layout)");
    expect(style.position).toBe("fixed");
    expect(style.zIndex).toBe(-1);
    expect(style.pointerEvents).toBe("none");
    expect(resolvePhiRootBackgroundPicture(null, "light").paint).toEqual({});
  });

  it("resolves the configured mode and leaves the other on the fallback", () => {
    const root = {
      background: {
        light: {
          base: {
            kind: "gradient" as const,
            direction: "to bottom" as const,
            stops: [
              { color: "#ffffff", percent: 0 },
              { color: "#e0e0ff", percent: 100 },
            ],
          },
        },
      },
    };
    const light = resolvePhiRootBackgroundPicture(root, "light");
    expect(light.paint.backgroundImage).toBe("linear-gradient(to bottom, #ffffff 0%, #e0e0ff 100%)");
    expect(light.imageUrl).toBeNull();
    const dark = resolvePhiRootBackgroundPicture(root, "dark");
    expect(dark.paint.backgroundImage).toBeUndefined();
    expect(dark.key).not.toBe(light.key);
  });

  it("keeps the fallback ground under an explicit \"none\" base", () => {
    const { paint } = resolvePhiRootBackgroundPicture(
      { background: { light: { base: { kind: "none" as const } } } },
      "light",
    );
    expect(paint.backgroundColor).toBeUndefined();
    expect(paint.backgroundImage).toBeUndefined();
  });

  it("paints a configured color over the fallback", () => {
    const { paint } = resolvePhiRootBackgroundPicture(
      { background: { dark: { base: { kind: "color" as const, color: "#101018" } } } },
      "dark",
    );
    expect(paint.backgroundColor).toBe("#101018");
  });

  it("waits for a fetched picture over the Asset's placeholder", () => {
    const picture = resolvePhiRootBackgroundPicture({
      background: {
        light: {
          base: {
            kind: "image" as const,
            sourceKind: "asset" as const,
            assetId: 12,
            resolvedAsset: { deliveryUrl: "/api/site/media/12/content", deliveryRevision: 3, blurDataUrl: "data:image/webp;base64,AAAA" },
          },
        },
      },
    }, "light");
    expect(picture.imageUrl).toMatch(/^\/api\/site\/media\/12\/content/);
    expect(picture.placeholder?.backgroundImage).toBe('url("data:image/webp;base64,AAAA")');
  });

  it("has nothing to wait for with an inline picture", () => {
    const picture = resolvePhiRootBackgroundPicture({
      background: { light: { base: { kind: "image" as const, sourceKind: "url" as const, sourceUrl: "data:image/svg+xml;base64,AAAA" } } },
    }, "light");
    expect(picture.paint.backgroundImage).toBe('url("data:image/svg+xml;base64,AAAA")');
    expect(picture.imageUrl).toBeNull();
    expect(picture.placeholder).toBeNull();
  });
});

/**
 * `fixed` holds an image still while its host travels past it, and this layer never travels. Only
 * `parallax` survives here, and where it does the image belongs to the motion layer alone.
 */
describe("root background motion", () => {
  const image = {
    kind: "image" as const,
    sourceKind: "url" as const,
    sourceUrl: "https://example.test/ground.jpg",
  };

  it("resolves parallax for the configured mode", () => {
    const motion = resolvePhiRootBackgroundMotion(
      { background: { light: { base: image, motion: { mode: "parallax" as const, strength: 0.4 } } } },
      "light",
    );
    expect(motion?.mode).toBe("parallax");
    expect(motion?.strength).toBe(0.4);
  });

  it("ignores a stored fixed mode and keeps painting the static ground", () => {
    const root = { background: { light: { base: image, motion: { mode: "fixed" as const } } } };
    expect(resolvePhiRootBackgroundMotion(root, "light")).toBeNull();
    const picture = resolvePhiRootBackgroundPicture(root, "light");
    expect(picture.paint.backgroundImage).toBe('url("https://example.test/ground.jpg")');
    expect(picture.motion).toBeNull();
  });

  it("hands the image to the motion layer and keeps only the fallback ground", () => {
    const picture = resolvePhiRootBackgroundPicture(
      { background: { dark: { base: image, motion: { mode: "parallax" as const } } } },
      "dark",
    );
    expect(picture.paint.backgroundImage).toBeUndefined();
    expect(picture.motion).not.toBeNull();
    expect(picture.imageUrl).toBe("https://example.test/ground.jpg");
  });

  it("keeps motion out of a mode that has no image", () => {
    expect(
      resolvePhiRootBackgroundMotion(
        { background: { light: { base: { kind: "color" as const, color: "#101018" }, motion: { mode: "parallax" as const } } } },
        "light",
      ),
    ).toBeNull();
  });
});
