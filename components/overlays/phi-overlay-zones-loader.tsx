"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { PhiCmsOverlayZonesLoader } from "../../types/cms-overlay-zones";

const PhiOverlayZonesLoaderContext = createContext<PhiCmsOverlayZonesLoader | null>(null);

/**
 * The Site's Server Action for an Overlay's zones, handed down once from the root layout.
 *
 * A Server Action is the one value a Server Component can give a Client one that calls back into the
 * server, and the root layout is the one place every Area's Overlays sit under -- so it is named there,
 * once, rather than in six Area boundaries.
 */
export function PhiOverlayZonesLoaderProvider({
  loader,
  children,
}: {
  loader: PhiCmsOverlayZonesLoader;
  children: ReactNode;
}) {
  return <PhiOverlayZonesLoaderContext.Provider value={loader}>{children}</PhiOverlayZonesLoaderContext.Provider>;
}

/**
 * The loader, or null outside a Site's root layout. Only a deferred Overlay needs it, and that one
 * refuses to open without it; an Overlay rendered with its zones -- a page-level one, a Builder canvas --
 * never asks.
 */
export function usePhiOverlayZonesLoaderIfAny(): PhiCmsOverlayZonesLoader | null {
  return useContext(PhiOverlayZonesLoaderContext);
}
