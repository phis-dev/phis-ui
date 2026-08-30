"use client";

import { useState } from "react";

import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { resolvePhiPageTitleSignalValue } from "../../../../../components/widgets/signals/page-title-signals";
import { createPhiCoreRuntimeControllerAddress } from "../../../../../components/runtime/core-runtime-controller-address";

export type PhiPageTitleWidgetClientProps = {
  initialTitle: string;
  area?: string | null;
};

export function PhiPageTitleWidgetClient({
  initialTitle,
  area,
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
