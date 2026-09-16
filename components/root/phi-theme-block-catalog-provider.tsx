"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { PhiThemeBlockCatalog } from "../../theme/phi-theme-composition";

/**
 * The Theme blocks a Site can follow, for the Widgets that choose among them.
 *
 * Only the Builder Area offers it. A page renders one Theme, which the root folds together on the
 * server; the catalogue -- every palette, style, ground and set of every installed Module -- is
 * authoring data. It used to ride on the root's config into every page, and a public page carried
 * every ground's picture whichever one it showed.
 */
const PhiThemeBlockCatalogContext = createContext<PhiThemeBlockCatalog | null>(null);

export function PhiThemeBlockCatalogProvider({
  catalog,
  children,
}: {
  catalog: PhiThemeBlockCatalog;
  children: ReactNode;
}) {
  return (
    <PhiThemeBlockCatalogContext.Provider value={catalog}>
      {children}
    </PhiThemeBlockCatalogContext.Provider>
  );
}

export function usePhiThemeBlockCatalog(): PhiThemeBlockCatalog {
  const catalog = useContext(PhiThemeBlockCatalogContext);
  if (!catalog) {
    throw new Error("PhiThemeBlockCatalogProvider is missing: only the Builder Area offers the Theme block catalogue.");
  }
  return catalog;
}
