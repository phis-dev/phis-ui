import { describe, expect, it } from "vitest";

import { resolvePhiBackgroundWidgetStyle } from "../../../../../components/widgets/config/background";
import { PHI_CARD_WIDGET_DEFINITION } from "./config";

const parse = (config: Record<string, unknown>) => PHI_CARD_WIDGET_DEFINITION.parseConfig(config);

describe("card image overlay", () => {
  it("reads an Overlay over the picture as a Background reads its own", () => {
    const overlay = {
      kind: "color",
      opacity: 0.6,
      ink: { kind: "gradient", direction: "180deg", stops: [{ color: "transparent", percent: 40 }, { color: "#161322", percent: 100 }] },
    };
    const parsed = parse({ imageOverlay: overlay });
    expect(parsed.imageOverlay).toEqual(overlay);
    expect(String(resolvePhiBackgroundWidgetStyle({ base: { kind: "none" }, overlay: parsed.imageOverlay }).backgroundImage)).not.toBe("");
  });

  it("states none where nothing readable is given", () => {
    expect(parse({}).imageOverlay).toBeUndefined();
    expect(parse({ imageOverlay: "dark" }).imageOverlay).toBeUndefined();
  });
});
