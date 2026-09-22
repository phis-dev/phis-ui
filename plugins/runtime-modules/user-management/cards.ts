import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import { getResolvedSiteStats } from "../../../gateway/site-stats";
import {
  createPhiDashboardCardId,
  type PhiDashboardCardContext,
  type PhiDashboardCardDescriptor,
  type PhiDashboardCardId,
  type PhiDashboardCardPayload,
  type PhiDashboardCardProvider,
} from "../../../types/dashboard-cards";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "./ids";

/**
 * How many accounts this Site has, answered by the Module that manages them.
 *
 * The figure is read the same way it always was -- the Site's own server call, with the internal token
 * -- and it stays on the server: the card that reaches the browser carries the number, not the address
 * it came from. That distinction is why the fan-in is answered in the Site rather than by a Collection
 * provider calling Core directly.
 */

const PHI_USER_MANAGEMENT_DASHBOARD_CARD_LABEL_SET = definePhiLabelSet({
  key: "cards:user-management-accounts",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    accounts_eyebrow: "Accounts",
    accounts_title: "Site users",
    accounts_description: "User accounts on this site",
    accounts_meta: "Admin, editor, accounting, auth, and shop accounts",
  },
});

const PHI_USER_MANAGEMENT_ACCOUNTS_CARD_ID =
  createPhiDashboardCardId(PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID, "accounts");

function readLabels(context: PhiDashboardCardContext) {
  const options: PhiGlobalTranslatorOptions = {
    apiBaseUrl: context.apiBaseUrl,
    internalToken: context.internalToken,
    locale: context.locale,
  };
  return getPhiLabelSet(options, PHI_USER_MANAGEMENT_DASHBOARD_CARD_LABEL_SET);
}

export const PHI_USER_MANAGEMENT_RUNTIME_MODULE_DASHBOARD_CARDS: PhiDashboardCardProvider = {
  async listCards(context): Promise<readonly PhiDashboardCardDescriptor[]> {
    if (context.area !== "admin") {
      return [];
    }
    const labels = await readLabels(context);
    return [{
      cardId: PHI_USER_MANAGEMENT_ACCOUNTS_CARD_ID,
      form: "stat",
      eyebrow: labels.accounts_eyebrow,
      title: labels.accounts_title,
      description: labels.accounts_description,
      mark: "antd:user",
      // Its own page, named as a preset: the Dashboard never learns where User Management lives.
      target: {
        ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
        presetKey: "admin-users-page",
      },
    }];
  },

  async resolveCard(cardId: PhiDashboardCardId, context): Promise<PhiDashboardCardPayload> {
    if (cardId !== PHI_USER_MANAGEMENT_ACCOUNTS_CARD_ID) {
      throw new Error(`Unknown User Management Dashboard card "${cardId}".`);
    }
    const labels = await readLabels(context);
    const { userCount } = await getResolvedSiteStats({
      apiBaseUrl: context.apiBaseUrl,
      internalToken: context.internalToken,
      siteKey: context.siteKey,
    });
    return {
      cardId,
      value: String(userCount),
      description: labels.accounts_description,
      meta: labels.accounts_meta,
      error: null,
      resolvedAt: new Date().toISOString(),
    };
  },
};
