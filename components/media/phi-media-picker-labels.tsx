"use client";

import { createContext, useContext, type ReactNode } from "react";

import { PHI_MEDIA_WIDGET_DEFAULT_LABELS, type PhiAssetWidgetLabels } from "./media-widget-labels";

/**
 * The words of the Media picker, read where a picker is opened.
 *
 * A picker is opened from many surfaces that have no Media Widget of their own: the Builder's image tool
 * button and mask picker, the Inspector's image and background fields, the Theme's logo and background
 * controls. Each of them used to take the English defaults, so the picker said "Search assets" and "No
 * assets found." to a reader of any language. Handing the loaded set down as a prop would teach every
 * station on the way about strings it only passes on, so the server half that renders the surface loads
 * `getPhiMediaWidgetLabels` and wraps the client subtree in this provider -- the way
 * `PhiAuthoringToolsLabelsProvider` does for the tool captions.
 *
 * Outside a provider the reading is the English defaults, which is what every one of those surfaces said
 * before.
 */
const PhiMediaPickerLabelsContext = createContext<PhiAssetWidgetLabels>(PHI_MEDIA_WIDGET_DEFAULT_LABELS);

export function PhiMediaPickerLabelsProvider({
  labels,
  children,
}: {
  labels?: PhiAssetWidgetLabels;
  children: ReactNode;
}) {
  return (
    <PhiMediaPickerLabelsContext.Provider value={labels ?? PHI_MEDIA_WIDGET_DEFAULT_LABELS}>
      {children}
    </PhiMediaPickerLabelsContext.Provider>
  );
}

export function usePhiMediaPickerLabels() {
  return useContext(PhiMediaPickerLabelsContext);
}
