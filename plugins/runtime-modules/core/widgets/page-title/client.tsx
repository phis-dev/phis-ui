"use client";

import { useState } from "react";

import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { resolvePhiPageTitleSignalValue } from "../../../../../components/widgets/signals/page-title-signals";
import { createPhiCoreRuntimeControllerAddress } from "../../../../../components/runtime/core-runtime-controller-address";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import type { PhiPageTitleWidgetDisplay } from "./config";

export type PhiPageTitleWidgetClientProps = {
  initialTitle: string;
  area?: string | null;
  display: PhiPageTitleWidgetDisplay;
};

export function PhiPageTitleWidgetClient({
  initialTitle,
  area,
  display,
}: PhiPageTitleWidgetClientProps) {
  const [state, setState] = useState(() => ({
    source: initialTitle,
    value: initialTitle,
  }));
  const title = state.source === initialTitle ? state.value : initialTitle;

  usePhiSignalListener((signal) => {
    if (
      signal.receiver !== "broadcast" ||
      signal.sender !== createPhiCoreRuntimeControllerAddress() ||
      (signal.channel !== "pageMeta" && signal.channel !== "pageTitle")
    ) {
      return;
    }

    const value = resolvePhiPageTitleSignalValue(signal);
    if (!value) {
      return;
    }
    const signalArea = value.area ?? null;
    if (area != null && signalArea !== area) {
      return;
    }

    if (typeof value.pageTitle !== "string") {
      return;
    }

    const nextTitle = value.pageTitle.trim();
    if (nextTitle.length > 0) {
      setState({
        source: initialTitle,
        value: nextTitle,
      });
    }
  }, {
    scopes: ["page"],
    channels: ["pageMeta", "pageTitle"],
    receiver: "broadcast",
  });

  if (display === "heading") {
    return (
      <PhiTypographyControl presentation="title" level={1} style={{ margin: 0, textAlign: "center" }}>
        {title}
      </PhiTypographyControl>
    );
  }

  return (
    <div
      style={{
        fontSize: "1.25rem",
        fontWeight: 600,
        lineHeight: 1.2,
        margin: 0,
        whiteSpace: "nowrap",
      }}
    >
      {title}
    </div>
  );
}
