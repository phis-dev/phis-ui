"use client";

import { useEffect, useRef, useState } from "react";

import type { PhiBlockBaseProps, PhiNoLabels, PhiRenderableBlockBase } from "../../../../../types";

export type PhiSpacerWidgetConfig = PhiRenderableBlockBase;

export type PhiSpacerWidgetProps = PhiBlockBaseProps<
  PhiNoLabels,
  PhiSpacerWidgetConfig
>;

function useSpacerOrientation() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateOrientation = () => {
      const rect = node.getBoundingClientRect();
      setOrientation(rect.width >= rect.height ? "horizontal" : "vertical");
    };

    updateOrientation();

    const observer = new ResizeObserver(() => updateOrientation());
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, orientation };
}

function SpacerGlyph({ orientation }: { orientation: "horizontal" | "vertical" }) {
  return (
    <div
      aria-hidden="true"
      className="phi-builder-spacer-glyph"
      data-orientation={orientation}
      style={{
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <div
        className="phi-builder-spacer-glyph__track"
      >
        <span className="phi-builder-spacer-glyph__cap" />
        <span className="phi-builder-spacer-glyph__line" />
        <span className="phi-builder-spacer-glyph__cap" />
      </div>
    </div>
  );
}

export function PhiSpacerWidget({
  config,
}: PhiSpacerWidgetProps) {
  const isEditor = config?.renderMode === "editor";
  const { ref, orientation } = useSpacerOrientation();

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flex: "1 1 auto",
        alignItems: "stretch",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isEditor ? "rgba(71, 85, 105, 0.035)" : "transparent",
          boxShadow: isEditor ? "inset 0 0 0 1px rgba(71, 85, 105, 0.18)" : "none",
          border: isEditor ? "1px dashed rgba(71, 85, 105, 0.45)" : "0",
          borderRadius: isEditor ? "var(--ant-border-radius-lg)" : 0,
        }}
      >
        {isEditor ? (
          <div
            aria-hidden="true"
            className="phi-builder-spacer"
          >
            <SpacerGlyph orientation={orientation} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
