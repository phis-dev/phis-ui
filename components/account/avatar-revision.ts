"use client";

import { createPhiOptionsRevisionStore } from "../controls/phi-options-revision";

/**
 * What says the viewer's avatar has changed.
 *
 * The picker and the display sit in two different trees -- one in an Area Overlay, one on a Page -- so
 * neither can hand the other a callback, and both read the same route with the session cookie rather
 * than receiving server-rendered data they could re-render. A revision is the smallest thing that
 * closes that: whoever writes announces, whoever displays asks again.
 *
 * One browser tab, like every other revision store here. Another device showing the old picture until
 * its next load is a server question.
 */
export const PHI_AVATAR_REVISION = createPhiOptionsRevisionStore();
