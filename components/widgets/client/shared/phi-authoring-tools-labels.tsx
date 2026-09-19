"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  PHI_AUTHORING_TOOLS_DEFAULT_LABELS,
  type PhiAuthoringToolsLabels,
} from "../../label-types/authoring-tools";

/**
 * The captions of the Builder's authoring tools, read where they are drawn.
 *
 * Every other label set in this house is drilled from the server-rendered Widget that fetched it,
 * because every other label set belongs to one Widget. This one belongs to a surface: eight files of
 * tool buttons that all render inside one scaffold, most of them reached through a Widget's own
 * `authoring.tsx`, which knows nothing about labels and has no reason to. Handing the set down as a
 * prop would teach every station on the way about strings it only passes on.
 *
 * The provider sits where the scaffold already puts `PhiWidgetScaffoldPopupProvider`, so a tool button
 * is inside it for the same reason its popup is.
 */
const PhiAuthoringToolsLabelsContext = createContext<PhiAuthoringToolsLabels>(
  PHI_AUTHORING_TOOLS_DEFAULT_LABELS,
);

export function PhiAuthoringToolsLabelsProvider({
  labels,
  children,
}: {
  labels?: PhiAuthoringToolsLabels;
  children: ReactNode;
}) {
  return (
    <PhiAuthoringToolsLabelsContext.Provider value={labels ?? PHI_AUTHORING_TOOLS_DEFAULT_LABELS}>
      {children}
    </PhiAuthoringToolsLabelsContext.Provider>
  );
}

export function usePhiAuthoringToolsLabels() {
  return useContext(PhiAuthoringToolsLabelsContext);
}
