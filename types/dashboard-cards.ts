import type { PhiCmsAreaKey } from "../constants/cms-areas";
import { createPhiModuleIdentifier, isPhiModuleScopedIdentifier } from "../constants/module-identity";
import type { PhiAccessViewer, PhiViewerAccessPolicy } from "./access";

/**
 * What a Module offers a Dashboard, and what it is asked for afterwards.
 *
 * A Dashboard is a Collection whose items are cards, so nothing here describes a component: a Module
 * states what its card is called and what it leads to, and Core draws it with the card presentation
 * every other Collection already uses. See DASHBOARD.md.
 *
 * Two shapes, because the list and the payload are two answers. The list is assembled from every active
 * Module at once and has to be cheap; a payload is one Module doing real work for one card, and it
 * arrives per card so that twelve of them cost the slowest one rather than the sum.
 */

/** `<owner>/cards/<leaf>`: the identity a card keeps across restarts. */
export type PhiDashboardCardId = `${string}/cards/${string}`;

export function isPhiDashboardCardId(value: unknown): value is PhiDashboardCardId {
  return isPhiModuleScopedIdentifier("cards", value);
}

/**
 * A card's id, written the way every other module-scoped identifier is.
 *
 * `cards` joins the closed set of namespaces a package's artifacts live under. A third party invents
 * Modules and leaves, not namespaces, so this is Core widening the grammar once -- and the reader above
 * is widened in the same file, because a grammar widened on the writing side alone turns stored data
 * into rejected data.
 */
export function createPhiDashboardCardId(moduleId: string, leaf: string): PhiDashboardCardId {
  return createPhiModuleIdentifier(moduleId, "cards", leaf, "segment") as PhiDashboardCardId;
}

/**
 * The card forms Core draws.
 *
 * `stat` is the one every contributor in sight needs: a figure, what it is, and where to go for more.
 * The form names a renderer and the payload fills it, so adding one later is a card View and a case in
 * the reader -- but a form Core offers is a promise it then keeps, so it gets offered when somebody has
 * the case rather than in advance. DASHBOARD.md section 9 leaves `list` and a series card open on
 * exactly those terms.
 */
export type PhiDashboardCardForm = "stat";

export type PhiDashboardCardDescriptor = {
  cardId: PhiDashboardCardId;
  form: PhiDashboardCardForm;
  /**
   * What the card says before its payload arrives, already translated.
   *
   * A descriptor is assembled on the server, where the label sets are, so a Module answers in the
   * viewer's language rather than handing Core a key to look up. `title` is what the figure will be
   * labelled with and it keeps that place afterwards, which is why a card that has not resolved reads
   * as itself and not as a grey box -- and why one that has resolved still says what it counted.
   */
  eyebrow?: string;
  title: string;
  description?: string;
  /**
   * The small sign beside the title: an icon a preset may name, resolved when it is named.
   *
   * `antd:` and a mark the Module ships in its own source qualify. A lookup does not -- `iconify:`
   * fetches from a third party in the visitor's browser and `asset:` names a file a fresh Site does not
   * have -- because nobody along the way chose this icon. MODULES.md states the rule; a card
   * contribution is the case it was written for.
   */
  mark?: string;
  /**
   * Where the card leads, as the contributing Module's own route preset.
   *
   * A preset key rather than a path, so the Dashboard never learns another Module's addresses and a
   * Site that moved the page keeps a working card. Core resolves it against the Area's active route
   * table, which means a target the viewer cannot reach simply yields no link.
   */
  target?: {
    ownerModuleId: string;
    presetKey: string;
  };
  /**
   * Who may see this card at all, when a policy is what decides it.
   *
   * The contributing Module answers the question either way: it states a policy here, or it leaves the
   * card out of its own list. Both are the provider answering, which is the point -- Core never guesses
   * from the Module's own access policy, because a Module a viewer may enter can still hold a card they
   * may not see.
   *
   * A card the viewer may not see is absent rather than empty: an empty card reports that the thing
   * exists, and it would reach the loading state to do it.
   */
  accessPolicy?: PhiViewerAccessPolicy | null;
};

/**
 * What one card resolved to.
 *
 * `error` is a field rather than a thrown request: a payload that fails leaves its own card saying so,
 * and the other eleven are unaffected. `resolvedAt` is here so a card can be honest about its age,
 * which is better than every card pretending to be live.
 */
export type PhiDashboardCardPayload = {
  cardId: PhiDashboardCardId;
  /** The figure, which takes the place the descriptor's title held while it was loading. */
  value?: string;
  description?: string;
  meta?: string;
  error?: string | null;
  resolvedAt: string;
};

/**
 * What a Module's card provider is handed.
 *
 * The same credentials a feature resolver gets, plus the two things a card decision turns on: which
 * Area is asking, and who is looking.
 */
export type PhiDashboardCardContext = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  locale: string;
  area: PhiCmsAreaKey;
  viewer: PhiAccessViewer;
};

/**
 * One Module's answer, loaded on the server and never reached from the browser.
 *
 * `listCards` is asked once per Dashboard request for every active Module; `resolveCard` is asked once
 * per card, by the card. A Module that contributes nothing to this Area answers with an empty list,
 * which is cheaper than Core deciding on its behalf.
 */
export type PhiDashboardCardProvider = {
  listCards: (
    context: PhiDashboardCardContext,
  ) => Promise<readonly PhiDashboardCardDescriptor[]> | readonly PhiDashboardCardDescriptor[];
  resolveCard: (
    cardId: PhiDashboardCardId,
    context: PhiDashboardCardContext,
  ) => Promise<PhiDashboardCardPayload> | PhiDashboardCardPayload;
};

/**
 * What the Dashboard's fan-in provider answers with, and what its card View reads.
 *
 * One row per card, because a Collection has rows. The descriptor's fields are flattened onto it so the
 * shared card presentation can point at them by path like any other resource -- `href` included, which
 * Core resolved from the target so the row carries an address rather than a preset key the browser
 * would have to look up.
 */
export type PhiDashboardCardRow = {
  cardId: PhiDashboardCardId;
  form: PhiDashboardCardForm;
  eyebrow?: string;
  title: string;
  description?: string;
  mark?: string;
  href?: string;
};
