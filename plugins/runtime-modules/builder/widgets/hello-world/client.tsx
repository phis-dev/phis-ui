import type { PhiBlockBaseProps, PhiRenderableBlockBase, PhiBlockRuntime } from "../../../../../types";

export type PhiHelloWorldWidgetLabels = {
  title: string;
};

export type PhiHelloWorldWidgetConfig = PhiRenderableBlockBase;

export type PhiHelloWorldWidgetProps = PhiBlockBaseProps<
  PhiHelloWorldWidgetLabels,
  PhiHelloWorldWidgetConfig,
  PhiBlockRuntime
> & {
  items?: Array<{
    key: string;
    label: string;
    value: string;
  }>;
};

function toCssSize(value: number | string | null | undefined, fallback: string) {
  if (typeof value === "number") {
    return `${value}px`;
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return fallback;
}

export function PhiHelloWorldWidget({
  labels,
  config,
  items = [],
}: PhiHelloWorldWidgetProps) {
  return (
    <div
      style={{
        width: "100%",
        minHeight: toCssSize(config?.size?.height, "240px"),
        borderRadius: 21,
        border: "1px solid rgba(148, 163, 184, 0.32)",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.95) 100%)",
        boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
        padding: 34,
      }}
    >
      <div style={{ width: "100%" }}>
        <div
          style={{
            fontSize: "clamp(32px, 6vw, 72px)",
            lineHeight: 1,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "#172554",
            marginBottom: 21,
          }}
        >
          {labels.title}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 13,
          }}
        >
          {items.map((item) => (
            <div
              key={item.key}
              style={{
                border: "1px solid rgba(148, 163, 184, 0.22)",
                borderRadius: 13,
                background: "rgba(255, 255, 255, 0.8)",
                padding: 13,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "rgba(23, 37, 84, 0.7)",
                  marginBottom: 8,
                }}
              >
                {item.label}
              </div>
              <div style={{ color: "#172554" }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
