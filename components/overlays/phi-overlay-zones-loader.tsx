"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { PhiCmsOverlayZonesLoader } from "../../types/cms-overlay-zones";

const PhiOverlayZonesLoaderContext = createContext<PhiCmsOverlayZonesLoader | null>(null);

/**
 * The provider for the Site's Server Action for an Overlay's zones, built by the Site in a Client file.
 *
 * The Action has to be imported from a Client module. Imported by a Server Component -- the root layout --
 * it joins that layout's server graph with everything it reaches, and the Action reaches every Area's
 * bridge: their catalogs name every Area's Widget clients, which then became client references of every
 * route, the Builder's on the Public landing. Imported from a Client file, the page holds a reference and
 * nothing else. The root layout mounts the provider this returns, once, above every Area.
 */
export function createPhiOverlayZonesLoaderProvider(loader: PhiCmsOverlayZonesLoader) {
  return function PhiOverlayZonesLoaderProvider({ children }: { children: ReactNode }) {
    return <PhiOverlayZonesLoaderContext.Provider value={loader}>{children}</PhiOverlayZonesLoaderContext.Provider>;
  };
}

/**
 * The loader, or null outside a Site's root layout. Only a deferred Overlay needs it, and that one
 * refuses to open without it; an Overlay rendered with its zones -- a page-level one, a Builder canvas --
 * never asks.
 */
export function usePhiOverlayZonesLoaderIfAny(): PhiCmsOverlayZonesLoader | null {
  return useContext(PhiOverlayZonesLoaderContext);
}
