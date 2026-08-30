"use client";

import { useEffect } from "react";

import { emitPhiPageTitleMetaSignal } from "../widgets/signals/page-title-signals";
import { usePhiSignalDispatcher } from "../runtime/runtime-signal-bus";

export type PhiCmsPageMetaSignalEmitterProps = {
  area?: string | null;
  pagePath?: string | null;
  pageType?: number | null;
  title?: string | null;
  description?: string | null;
};

export function PhiCmsPageMetaSignalEmitter({
  area,
  pagePath,
  pageType,
  title,
  description,
}: PhiCmsPageMetaSignalEmitterProps) {
  const emitSignal = usePhiSignalDispatcher();
  useEffect(() => {
    emitPhiPageTitleMetaSignal({
      emitSignal,
      area,
      pagePath,
      pageType,
      title,
      description,
    });
  }, [area, description, emitSignal, pagePath, pageType, title]);

  return null;
}
