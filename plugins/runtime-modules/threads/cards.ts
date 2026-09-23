import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import { getPhiThreadInboxStats } from "../../../gateway/thread-inbox-stats";
import { PHI_VIEWER_ACCESS_AUTHENTICATED } from "../../../types/access";
import {
  createPhiDashboardCardId,
  type PhiDashboardCardContext,
  type PhiDashboardCardDescriptor,
  type PhiDashboardCardId,
  type PhiDashboardCardPayload,
  type PhiDashboardCardProvider,
} from "../../../types/dashboard-cards";
import { PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";

/**
 * What is waiting in this person's inbox, on the Dashboard of the Area the inbox lives in.
 *
 * The first card about the viewer rather than about the installation. The three cards written before
 * it count things a Site has -- accounts, locales, uptime -- and any of them could be answered with the
 * service credential alone. This one cannot: Core resolves "my conversations" from the session, so the
 * card asks with the request's own cookies and the answer differs for every person looking at the same
 * Dashboard.
 *
 * It is offered in `app` and nowhere else, because that is where this Module is eligible and where its
 * page is. A card whose target cannot be resolved in the Area showing it would be a card that leads
 * nowhere, and the Area guard is what keeps that from being possible rather than merely unlikely.
 */

const PHI_THREADS_DASHBOARD_CARD_LABEL_SET = definePhiLabelSet({
  key: "cards:threads-inbox",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    inbox_eyebrow: "Inbox",
    inbox_title: "Unread conversations",
    inbox_description: "Conversations with messages you have not read",
    inbox_meta_waiting: "Open the inbox to read them",
    inbox_meta_clear: "Nothing new",
  },
});

const PHI_THREADS_INBOX_CARD_ID =
  createPhiDashboardCardId(PHI_THREADS_RUNTIME_MODULE_ID, "inbox");

function readLabels(context: PhiDashboardCardContext) {
  const options: PhiGlobalTranslatorOptions = {
    apiBaseUrl: context.apiBaseUrl,
    internalToken: context.internalToken,
    locale: context.locale,
  };
  return getPhiLabelSet(options, PHI_THREADS_DASHBOARD_CARD_LABEL_SET);
}

export const PHI_THREADS_RUNTIME_MODULE_DASHBOARD_CARDS: PhiDashboardCardProvider = {
  async listCards(context): Promise<readonly PhiDashboardCardDescriptor[]> {
    if (context.area !== "app") {
      return [];
    }
    const labels = await readLabels(context);
    return [{
      cardId: PHI_THREADS_INBOX_CARD_ID,
      form: "stat",
      eyebrow: labels.inbox_eyebrow,
      title: labels.inbox_title,
      description: labels.inbox_description,
      // The sign the sidebar entry already wears, so the card and the way to it are the same thing.
      mark: "antd:message",
      target: {
        ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
        presetKey: "app-threads-page",
      },
      /*
       * Stated rather than assumed. The Page behind it asks for the same, and a card that counts
       * somebody's own mail must never reach the loading state for a visitor who is not signed in --
       * the payload would refuse, but by then the card is on screen saying there is an inbox.
       */
      accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED,
    }];
  },

  async resolveCard(cardId: PhiDashboardCardId, context): Promise<PhiDashboardCardPayload> {
    if (cardId !== PHI_THREADS_INBOX_CARD_ID) {
      throw new Error(`Unknown Conversations Dashboard card "${cardId}".`);
    }
    const labels = await readLabels(context);
    const { unreadThreadCount } = await getPhiThreadInboxStats({
      apiBaseUrl: context.apiBaseUrl,
      internalToken: context.internalToken,
      siteKey: context.siteKey,
      cookieHeader: context.cookieHeader,
    });
    return {
      cardId,
      value: String(unreadThreadCount),
      description: labels.inbox_description,
      meta: unreadThreadCount > 0 ? labels.inbox_meta_waiting : labels.inbox_meta_clear,
      error: null,
      resolvedAt: new Date().toISOString(),
    };
  },
};
