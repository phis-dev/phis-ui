import {
  createPhiSharedRuntimeDataProviderKey,
  createPhiSharedRuntimeItemRendererKey,
} from "./runtime-data-provider-key";

/**
 * The Dashboard's fan-in, named as a Foundation contract.
 *
 * A Collection reads one provider and one resource, and a Dashboard's rows come from N Modules, so
 * something has to fan them in. This is the name of that one provider: whoever places a Dashboard --
 * the Module's own page preset, a Site putting a filtered one beside a Module's surface -- cites these
 * keys, and whether anything serves them is decided by the installation.
 *
 * Stated here rather than in `plugins/runtime-modules/dashboard/ids.ts` for the reason the Media
 * library's keys are: the Render Client manifest is browser code and must not reach a file that
 * declares a Module. The Foundation states the contract and holds no reference to the Module meeting
 * it -- which is also what leaves room for a third party's own Dashboard Module to collect the same
 * contributions under its own name.
 */
export const PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY =
  createPhiSharedRuntimeDataProviderKey("collections", "dashboard-cards");

/** The View that draws a card: the descriptor at once, the payload when it arrives. */
export const PHI_DASHBOARD_CARD_ITEM_RENDERER_KEY =
  createPhiSharedRuntimeItemRendererKey("dashboard-card");

/** The one resource the fan-in provider answers. */
export const PHI_DASHBOARD_CARD_RESOURCE_KEY = "cards";
