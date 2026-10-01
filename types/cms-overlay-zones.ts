import type { ReactNode } from "react";

import type { PhiCmsAreaKey } from "../constants/cms-areas";
import type { PhiCmsInstanceId } from "./cms-instance-id";

/**
 * What a closed Overlay asks for the first time it opens: its zones, rendered on the server.
 *
 * A closed Overlay used to carry its zones in the page's server payload anyway, and with them every
 * Client implementation inside -- the sign-in Form, its Controls, the validation library -- on every page
 * of the Area, for the few visitors who ever open it. It now carries this instead: where it stands, so the
 * server can render the same Area for the same viewer again, and which Overlay it is.
 */
export type PhiCmsOverlayZonesRequest = {
  area: PhiCmsAreaKey;
  /** The root segment the Area Boundary rendered under -- an Area key, or a locale in Public. */
  root: string;
  /** The path segments the Area Boundary resolved, when it was given some. */
  path: string[] | null;
  overlayId: PhiCmsInstanceId;
};

export type PhiCmsOverlayZones = {
  header: ReactNode;
  body: ReactNode;
  footer: ReactNode;
};

/** The Server Action a Site provides, named by the root layout and handed to every Overlay. */
export type PhiCmsOverlayZonesLoader = (
  request: PhiCmsOverlayZonesRequest,
) => Promise<PhiCmsOverlayZones | null>;
