import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { computePhiSeriesChartGeometry, PhiSeriesChartControl } from "./phi-series-chart-control";

const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;
const lines = (html: string) => count(html, /<path d="M[^"]*" fill="none"/g);
const dots = (html: string) => count(html, /data-phi-series-chart-last/g);

describe("PhiSeriesChartControl", () => {
  it("draws only its baseline for an empty series, and says nothing it does not know", () => {
    const html = renderToStaticMarkup(<PhiSeriesChartControl locale="en" keys={[]} series={[{ label: "Views", values: [] }]} />);
    expect(html).toContain("<svg");
    expect(lines(html)).toBe(0);
    expect(dots(html)).toBe(0);
    expect(html).not.toContain("aria-label");
  });

  it("draws one point as its emphasized dot, centred, without a line", () => {
    const html = renderToStaticMarkup(
      <PhiSeriesChartControl locale="en" title="Downloads" unit="downloads" keys={["Nov 5, 2026"]} series={[{ label: "npm", values: [1500] }]} />,
    );
    expect(lines(html)).toBe(0);
    expect(dots(html)).toBe(1);
    expect(html).toContain("left:50%");
    expect(html).toContain('aria-label="Downloads -- Nov 5, 2026: npm 1,500 downloads"');
    // Said by the house hover text, never the browser's own bubble.
    expect(html).not.toContain("<title>");
  });

  it("draws a flat series as a level line, and an all-zero one on the baseline", () => {
    const flat = computePhiSeriesChartGeometry([{ label: "Views", values: [5, 5, 5] }], 3);
    expect(new Set(flat.series[0]!.map((point) => point.y)).size).toBe(1);
    expect(flat.series[0]![0]!.y).toBeLessThan(flat.baseline);

    const zero = computePhiSeriesChartGeometry([{ label: "Views", values: [0, 0, 0] }], 3);
    expect(zero.series[0]!.every((point) => point.y === zero.baseline)).toBe(true);

    const html = renderToStaticMarkup(<PhiSeriesChartControl locale="en" keys={["a", "b", "c"]} series={[{ label: "Views", values: [5, 5, 5] }]} />);
    expect(lines(html)).toBe(1);
    expect(html).not.toContain("NaN");
  });

  it("draws a line and a dot per series, a legend, and every latest figure in its label", () => {
    const html = renderToStaticMarkup(
      <PhiSeriesChartControl
        locale="en"
        title="GitHub views"
        keys={["Nov 3", "Nov 4", "Nov 5"]}
        series={[
          { label: "Views", values: [10, 40, 30] },
          { label: "Unique visitors", values: [3, 9, 8] },
        ]}
      />,
    );
    expect(lines(html)).toBe(2);
    expect(dots(html)).toBe(2);
    expect(html).toContain("GitHub views -- Nov 5: Views 30, Unique visitors 8");
    expect(html).toContain(">Unique visitors</span>");
    expect(html).toContain(">Nov 3</span>");
    // Theme variables, never resolved colours, so a Surface tone reaches the lines.
    expect(html).toContain("stroke:var(--ant-color-primary)");
    expect(html).not.toMatch(/#[0-9a-f]{6}/i);
  });

  it("scales the highest point to the top and zero to the baseline", () => {
    const geometry = computePhiSeriesChartGeometry([{ label: "Views", values: [0, 50, 100] }], 3);
    const [low, , high] = geometry.series[0]!;
    expect(low!.y).toBe(geometry.baseline);
    expect(high!.y).toBe(geometry.top);
    expect(high!.x).toBe(100);
  });
});
