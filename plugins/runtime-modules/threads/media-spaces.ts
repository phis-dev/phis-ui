import type { PhiMediaKindValue } from "../../../types/media";

/**
 * What a conversation carries, as both halves of the offer need to read it.
 *
 * Its own file because the two readers sit on opposite sides of the Server/Client seam: the Module
 * definition declares the Space on the Server, and the composer offers the file dialog in a browser.
 * A Client Widget that reached for the definition to find this out would pull the Module's Providers,
 * its Forms and everything they import into the browser bundle -- which is how a Server-only label set
 * ends up in a Client Component.
 *
 * A screenshot, a recording, a log -- `text/plain` resolves to `document` -- and an archive of several.
 * `binary` is absent for the reason the groups Module leaves it out: distributing executables is a Site
 * decision taken in the Site Space.
 */
export const PHI_THREADS_USER_SPACE_MEDIA_KINDS = [
  "image",
  "video",
  "audio",
  "pdf",
  "markdown",
  "document",
  "archive",
] as const satisfies readonly PhiMediaKindValue[];
