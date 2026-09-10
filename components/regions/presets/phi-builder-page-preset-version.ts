/**
 * The version of the shared Builder workspace tree.
 *
 * Every Builder route roots its page on `buildPhiDefaultBuilderPagePresetTree`, so a change to that
 * tree changes all of them at once. The routes fold this number into their own `presetVersion`,
 * which is how a stored copy of a workspace page learns that it is out of date. Bump it whenever the
 * canonical workspace tree changes.
 *
 * It lives apart from the tree itself because the routes reach the tree through a dynamic import and
 * must not pull that module -- and everything it renders -- into their own graph just to read a
 * number.
 */
export const PHI_BUILDER_PAGE_PRESET_VERSION = 1;
