import type { PhiMediaKindValue } from "../../../types/media";

/**
 * A picture and nothing else, as both halves of the offer need to read it.
 *
 * Its own file because the two readers sit on opposite sides of the Server/Client seam: the Module
 * definition declares the Space on the Server, and the picker offers the file dialog in a browser. A
 * Client Widget that reached for the definition to find this out would pull the Module's Providers and
 * Forms into the browser bundle with it.
 */
export const PHI_AVATAR_USER_SPACE_MEDIA_KINDS = ["image"] as const satisfies readonly PhiMediaKindValue[];
