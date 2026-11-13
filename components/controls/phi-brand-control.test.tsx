import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhiBrandControl } from "./phi-brand-control";

const brand = {
  wordmark: {
    parts: [
      { text: "phi", color: { light: "#112233", dark: "#ddeeff" } },
      { text: "s", color: { dark: "#ffaa00" } },
    ],
  },
};

describe("PhiBrandControl Wordmark colour", () => {
  it("draws each part in the colour of the mode being drawn", () => {
    expect(renderToStaticMarkup(<PhiBrandControl brand={brand} shows="wordmark" mode="light" />))
      .toContain("color:#112233");
    expect(renderToStaticMarkup(<PhiBrandControl brand={brand} shows="wordmark" mode="dark" />))
      .toContain("color:#ddeeff");
  });

  it("leaves a part without a colour for the mode in the colour around it", () => {
    const light = renderToStaticMarkup(<PhiBrandControl brand={brand} shows="wordmark" mode="light" />);
    expect(light).not.toContain("#ffaa00");
    expect(light).toContain("<span>s</span>");
  });
});
