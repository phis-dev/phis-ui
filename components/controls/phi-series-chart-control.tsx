import { PHI_COLOR, PHI_FONT_SIZE, PHI_SPACE } from "../../theme/antd-css-var-contract";

/**
 * Figures over time: a line per series across the width it is given.
 *
 * Drawn as SVG by hand rather than through a chart library. What a card asks of it is a shape -- rising,
 * falling, a spike last Tuesday -- and its latest figure, not axes to read values off; a library would
 * bring a second rendering model and a dependency to every Site for that. No hooks and no Ant Design, so
 * a server render draws it as well as a client one.
 *
 * The drawing is stretched to its box (`preserveAspectRatio="none"`) with strokes that do not stretch
 * with it, so the chart takes its container's width at any size. The last point of each series is the
 * emphasized one, drawn over the SVG rather than in it: a circle in a stretched drawing would be an ellipse.
 *
 * Every colour is the Theme's variable (`PHI_COLOR`), never a resolved value, so a Surface `tone` reaches
 * the lines. The first series is the Theme's primary, with an area under it; the second and third are the
 * text colours, the third dashed, so two lines differ in more than hue.
 *
 * The scale starts at zero for figures that are never negative, which counts are: a line that starts at
 * its own minimum turns a day with one more visitor into a cliff.
 */
export type PhiSeriesChartControlSeries = {
  label: string;
  /** One value per key, in the keys' order. */
  values: readonly number[];
};

export type PhiSeriesChartControlProps = {
  /** What each point is called, already in words -- its day -- oldest first. */
  keys: readonly string[];
  series: readonly PhiSeriesChartControlSeries[];
  /** A word for what is counted, already translated; said after each latest figure. */
  unit?: string;
  /** The page's locale, for the figures in the spoken label. */
  locale: string;
  /** What the chart is of, said before its latest figures. */
  title?: string;
  /** The drawing's height in pixels; its width is the container's. */
  height?: number;
};

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 100;
/* Room above the highest point and below the baseline, so the emphasized dot is not clipped. */
const VIEW_INSET = 8;

const SERIES_STROKES: readonly { color: string; dash?: string }[] = [
  { color: PHI_COLOR.primary },
  { color: PHI_COLOR.textSecondary },
  { color: PHI_COLOR.textTertiary, dash: "4 3" },
];

function strokeOf(index: number) {
  return SERIES_STROKES[index % SERIES_STROKES.length]!;
}

function finite(values: readonly number[]) {
  return values.filter((value) => Number.isFinite(value));
}

/** Where each series' points stand in the drawing's own coordinates. */
export function computePhiSeriesChartGeometry(series: readonly PhiSeriesChartControlSeries[], pointCount: number) {
  const all = series.flatMap((entry) => finite(entry.values.slice(0, pointCount)));
  const low = Math.min(0, ...all);
  const high = Math.max(0, ...all);
  const range = high - low || 1;
  const xOf = (index: number) => (pointCount <= 1 ? VIEW_WIDTH / 2 : (index / (pointCount - 1)) * VIEW_WIDTH);
  const yOf = (value: number) => VIEW_INSET + (1 - (value - low) / range) * (VIEW_HEIGHT - 2 * VIEW_INSET);
  return {
    baseline: yOf(Math.max(low, 0)),
    top: yOf(high),
    series: series.map((entry) =>
      entry.values.slice(0, pointCount).flatMap((value, index) =>
        Number.isFinite(value) ? [{ x: xOf(index), y: yOf(value), value }] : [])),
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function linePath(points: readonly { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${round(point.x)} ${round(point.y)}`).join(" ");
}

export function PhiSeriesChartControl({
  keys,
  series,
  unit,
  locale,
  title,
  height = 64,
}: PhiSeriesChartControlProps) {
  const pointCount = keys.length;
  const geometry = computePhiSeriesChartGeometry(series, pointCount);
  const numbers = new Intl.NumberFormat(locale);
  const lastKey = keys[pointCount - 1];
  const latest = series.flatMap((entry) => {
    const value = entry.values[pointCount - 1];
    return value !== undefined && Number.isFinite(value)
      ? [`${entry.label} ${numbers.format(value)}${unit ? ` ${unit}` : ""}`]
      : [];
  });
  /* What a reader who cannot see the lines is told: what it is, the latest day, each series' figure on it. */
  const spoken = [title, lastKey && latest.length > 0 ? `${lastKey}: ${latest.join(", ")}` : null]
    .filter(Boolean)
    .join(" -- ");

  const first = geometry.series[0] ?? [];
  const area = first.length > 1
    ? `${linePath(first)} L${round(first[first.length - 1]!.x)} ${round(geometry.baseline)} L${round(first[0]!.x)} ${round(geometry.baseline)} Z`
    : null;

  return (
    <figure style={{ margin: 0, display: "grid", gap: PHI_SPACE.xxs, minWidth: 0 }} data-phi-series-chart="">
      <div style={{ position: "relative", height, minWidth: 0 }}>
        <svg
          role="img"
          aria-label={spoken || undefined}
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          width="100%"
          height={height}
          style={{ display: "block", overflow: "visible" }}
        >
          {spoken ? <title>{spoken}</title> : null}
          <line
            x1={0}
            x2={VIEW_WIDTH}
            y1={round(geometry.top)}
            y2={round(geometry.top)}
            vectorEffect="non-scaling-stroke"
            strokeWidth={1}
            strokeDasharray="2 3"
            style={{ stroke: PHI_COLOR.split }}
          />
          <line
            x1={0}
            x2={VIEW_WIDTH}
            y1={round(geometry.baseline)}
            y2={round(geometry.baseline)}
            vectorEffect="non-scaling-stroke"
            strokeWidth={1}
            style={{ stroke: PHI_COLOR.border }}
          />
          {area ? (
            <path d={area} style={{ fill: `color-mix(in srgb, ${PHI_COLOR.primary} 14%, transparent)`, stroke: "none" }} />
          ) : null}
          {geometry.series.map((points, index) => points.length > 1 ? (
            <path
              key={index}
              d={linePath(points)}
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeWidth={index === 0 ? 2 : 1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              {...(strokeOf(index).dash ? { strokeDasharray: strokeOf(index).dash } : {})}
              style={{ stroke: strokeOf(index).color }}
            />
          ) : null)}
        </svg>
        {geometry.series.map((points, index) => {
          /* The latest day's point, where the series has a figure for that day. */
          const last = points[points.length - 1];
          return last && Number.isFinite(series[index]!.values[pointCount - 1]) ? (
            <span
              key={index}
              aria-hidden="true"
              data-phi-series-chart-last=""
              style={{
                position: "absolute",
                left: `${round((last.x / VIEW_WIDTH) * 100)}%`,
                top: `${round((last.y / VIEW_HEIGHT) * 100)}%`,
                width: 8,
                height: 8,
                borderRadius: "50%",
                transform: "translate(-50%, -50%)",
                background: strokeOf(index).color,
                boxShadow: `0 0 0 2px ${PHI_COLOR.bgContainer}`,
              }}
            />
          ) : null;
        })}
      </div>
      {series.length > 1 || pointCount > 1 ? (
        <figcaption
          aria-hidden="true"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            columnGap: PHI_SPACE.sm,
            fontSize: PHI_FONT_SIZE.sm,
            color: PHI_COLOR.textTertiary,
            minWidth: 0,
          }}
        >
          {pointCount > 1 ? <span>{keys[0]}</span> : null}
          {series.length > 1 ? (
            <span style={{ display: "inline-flex", flexWrap: "wrap", columnGap: PHI_SPACE.xs }}>
              {series.map((entry, index) => (
                <span key={index} style={{ display: "inline-flex", alignItems: "center", gap: PHI_SPACE.xxs }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      borderTop: `2px ${strokeOf(index).dash ? "dashed" : "solid"} ${strokeOf(index).color}`,
                    }}
                  />
                  {entry.label}
                </span>
              ))}
            </span>
          ) : null}
          {pointCount > 1 ? <span>{lastKey}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
