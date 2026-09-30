"use client";

import { useMemo, type ReactNode } from "react";

import { PhiAuthoringPageReferencesProvider } from "../../../components/widgets/client/shared/phi-page-reference-picker";
import { usePhiBuilderOfferedPageCatalog } from "./use-offered-page-catalog";
import { buildPhiBuilderPageReferenceTree } from "./page-reference-tree";
import { usePhiDeveloperBuilderStateValue } from "./developer-workspace-store";

/** Offers the edited Area's Pages to the authoring tools' page picker. */
export function PhiBuilderPageReferencesProvider({ children }: { children: ReactNode }) {
  const state = usePhiDeveloperBuilderStateValue("public", (value) => value);
  const pages = usePhiBuilderOfferedPageCatalog(state, state.area);
  const options = useMemo(
    () => buildPhiBuilderPageReferenceTree(state.area, pages, pages),
    [pages, state.area],
  );

  return <PhiAuthoringPageReferencesProvider options={options}>{children}</PhiAuthoringPageReferencesProvider>;
}
