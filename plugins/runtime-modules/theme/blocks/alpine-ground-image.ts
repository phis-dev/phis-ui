/**
 * The picture the "Alpine" ground paints, carried in the Module rather than in a Site's Media library.
 *
 * A file beside this one, named through `new URL(..., import.meta.url)`. The Site build turns that
 * expression into the file's own address -- `/_next/static/media/alpine-ground.<hash>.jpg`, served
 * with an immutable cache -- so a page that shows the ground fetches the picture once, and a page that
 * does not never pays for it. As a data URL it travelled inside the Theme block catalogue, which the
 * root handed to the browser on every page: every ground's picture, twice, whichever one was in use.
 *
 * Not a static image import: Node cannot load an image module, and the scripts that read the catalogue
 * outside a Next build run on Node. There the expression is a `file:` URL, which is all a script
 * comparing blocks needs.
 *
 * It stays small on purpose. A Module's picture travels in every install of that Module, wanted or not,
 * and the moment somebody saves the Theme it is taken into the Site's own Media library anyway.
 */
export const PHI_THEME_ALPINE_GROUND_IMAGE = new URL("./alpine-ground.jpg", import.meta.url).href;
