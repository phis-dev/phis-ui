import type { CSSProperties } from "react";

const frameStyle: CSSProperties = {
  display: "grid",
  gap: "var(--phi-padding-xs)",
  gridTemplateRows: "auto auto minmax(5rem, 1fr) auto",
  minHeight: "10rem",
  width: "100%",
  height: "100%",
  padding: "var(--phi-padding-sm)",
  border: "1px solid var(--phi-color-border-secondary)",
  borderRadius: "var(--phi-border-radius-lg)",
  background: "var(--phi-color-bg-layout)",
  boxSizing: "border-box",
};

const regionStyle: CSSProperties = {
  minHeight: "1.25rem",
  borderRadius: "var(--phi-border-radius-sm)",
  background: "var(--phi-color-fill-secondary)",
};

function Region({ style }: { style?: CSSProperties }) {
  return <div aria-hidden style={{ ...regionStyle, ...style }} />;
}

export function PhiBuilderWorkspacePreviewSkeleton({
  kind,
}: {
  kind: "pages" | "shells";
}) {
  return (
    <div
      aria-label={kind === "pages" ? "Pages workspace preview" : "Shells workspace preview"}
      data-phi-builder-workspace-preview={kind}
      style={frameStyle}
    >
      <Region />
      <Region style={{ minHeight: kind === "pages" ? "2rem" : "1.5rem" }} />
      <div
        style={{
          display: "grid",
          gap: "var(--phi-padding-xs)",
          gridTemplateColumns: kind === "pages" ? "minmax(0, 1fr) 22%" : "22% minmax(0, 1fr)",
          minHeight: 0,
        }}
      >
        <Region />
        <Region />
      </div>
      <Region />
    </div>
  );
}
