import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import { formatPhiTranslation } from "../../../helpers/translation-format";
import { maybeGetPhiRequestRuntime } from "../../../server-helpers/request-runtime";
import {
  createPhiDashboardCardId,
  type PhiDashboardCardContext,
  type PhiDashboardCardDescriptor,
  type PhiDashboardCardId,
  type PhiDashboardCardPayload,
  type PhiDashboardCardProvider,
} from "../../../types/dashboard-cards";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "./ids";

/**
 * Which language this request is in, and which ones the Site offers.
 *
 * Two cards rather than one, because they answer different questions: the first is about this visit and
 * the second about the Site's configuration, and a card that tried to be both would be a card nobody
 * could act on.
 */

const PHI_LOCALIZATION_DASHBOARD_CARD_LABEL_SET = definePhiLabelSet({
  key: "cards:localization-locales",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    locale_eyebrow: "Locale",
    locale_title: "Current locale",
    locale_description: "Resolved request locale",
    locale_meta: "Resolved from request, profile, cookie, browser, or Site fallback",
    locales_eyebrow: "Locales",
    locales_title: "Available locales",
    locales_description: "Locales configured for this site",
    locales_meta: definePhiMessageLabel("%1 configured locales"),
  },
});

const PHI_LOCALIZATION_CURRENT_LOCALE_CARD_ID =
  createPhiDashboardCardId(PHI_LOCALIZATION_RUNTIME_MODULE_ID, "current-locale");
const PHI_LOCALIZATION_AVAILABLE_LOCALES_CARD_ID =
  createPhiDashboardCardId(PHI_LOCALIZATION_RUNTIME_MODULE_ID, "available-locales");

function readLabels(context: PhiDashboardCardContext) {
  const options: PhiGlobalTranslatorOptions = {
    apiBaseUrl: context.apiBaseUrl,
    internalToken: context.internalToken,
    locale: context.locale,
  };
  return getPhiLabelSet(options, PHI_LOCALIZATION_DASHBOARD_CARD_LABEL_SET);
}

/**
 * The Site's locales, from the runtime the request already resolved.
 *
 * The card is resolved inside a request runtime scope, so this is the same list the page itself would
 * read -- not a second fetch with its own answer.
 */
function readAvailableLocales() {
  return maybeGetPhiRequestRuntime()?.site.availableLocales ?? [];
}

const LOCALIZATION_CARD_TARGET = {
  ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
  presetKey: "admin-locales-page",
} as const;

export const PHI_LOCALIZATION_RUNTIME_MODULE_DASHBOARD_CARDS: PhiDashboardCardProvider = {
  async listCards(context): Promise<readonly PhiDashboardCardDescriptor[]> {
    if (context.area !== "admin") {
      return [];
    }
    const labels = await readLabels(context);
    return [
      {
        cardId: PHI_LOCALIZATION_CURRENT_LOCALE_CARD_ID,
        form: "stat",
        eyebrow: labels.locale_eyebrow,
        title: labels.locale_title,
        description: labels.locale_description,
        mark: "antd:global",
        target: { ...LOCALIZATION_CARD_TARGET },
      },
      {
        cardId: PHI_LOCALIZATION_AVAILABLE_LOCALES_CARD_ID,
        form: "stat",
        eyebrow: labels.locales_eyebrow,
        title: labels.locales_title,
        description: labels.locales_description,
        mark: "antd:global",
        target: { ...LOCALIZATION_CARD_TARGET },
      },
    ];
  },

  async resolveCard(cardId: PhiDashboardCardId, context): Promise<PhiDashboardCardPayload> {
    const labels = await readLabels(context);
    const resolvedAt = new Date().toISOString();

    if (cardId === PHI_LOCALIZATION_CURRENT_LOCALE_CARD_ID) {
      return {
        cardId,
        value: context.locale,
        description: labels.locale_description,
        meta: labels.locale_meta,
        error: null,
        resolvedAt,
      };
    }

    if (cardId === PHI_LOCALIZATION_AVAILABLE_LOCALES_CARD_ID) {
      const available = readAvailableLocales();
      const codes = available
        .map((locale) => locale.code.trim())
        .filter(Boolean)
        .join(", ");
      return {
        cardId,
        value: codes || context.locale,
        description: labels.locales_description,
        meta: formatPhiTranslation(labels.locales_meta, available.length),
        error: null,
        resolvedAt,
      };
    }

    throw new Error(`Unknown Localization Dashboard card "${cardId}".`);
  },
};
