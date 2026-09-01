/*
 * The flags live in `@phis/contracts/access`: phi-server checks a viewer against the same bits, and two
 * hand-kept copies of a bitmask is a way to grant the wrong role without anyone noticing.
 */
export { PhiBaseRole } from "@phis/contracts/access";
