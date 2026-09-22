import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  createPhiDashboardCardId,
  type PhiDashboardCardContext,
  type PhiDashboardCardDescriptor,
  type PhiDashboardCardId,
  type PhiDashboardCardPayload,
  type PhiDashboardCardProvider,
} from "../../../types/dashboard-cards";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./ids";

/**
 * The runtime the Site itself is running in.
 *
 * It belongs to the platform Module rather than to Observability, and the reason is who sees it: the
 * Admin Dashboard showed this figure to every administrator, and Observability is gated on developer
 * tools. Moving the card there would have taken it away from most of the people who had it, which is a
 * change nobody asked for. What the figure is has not changed either -- the card resolves in the Site
 * process, which is the process this uptime is of.
 */

const PHI_CORE_DASHBOARD_CARD_LABEL_SET = definePhiLabelSet({
  key: "cards:core-runtime",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    runtime_eyebrow: "Runtime",
    uptime_title: "Server uptime",
    uptime_description: "Server process uptime",
    uptime_meta: "Running on the current worker",
  },
});

const PHI_CORE_UPTIME_CARD_ID = createPhiDashboardCardId(PHI_CORE_RUNTIME_MODULE_ID, "uptime");

function readLabels(context: PhiDashboardCardContext) {
  const options: PhiGlobalTranslatorOptions = {
    apiBaseUrl: context.apiBaseUrl,
    internalToken: context.internalToken,
    locale: context.locale,
  };
  return getPhiLabelSet(options, PHI_CORE_DASHBOARD_CARD_LABEL_SET);
}

function formatUptime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export const PHI_CORE_RUNTIME_MODULE_DASHBOARD_CARDS: PhiDashboardCardProvider = {
  /*
   * One Area only. Core reaches every Area there is, and a runtime figure is an operator's fact: on an
   * App Dashboard it would be something a visitor can read and nobody can act on.
   */
  async listCards(context): Promise<readonly PhiDashboardCardDescriptor[]> {
    if (context.area !== "admin") {
      return [];
    }
    const labels = await readLabels(context);
    return [{
      cardId: PHI_CORE_UPTIME_CARD_ID,
      form: "stat",
      eyebrow: labels.runtime_eyebrow,
      title: labels.uptime_title,
      description: labels.uptime_description,
      mark: "antd:dashboard",
    }];
  },

  async resolveCard(cardId: PhiDashboardCardId, context): Promise<PhiDashboardCardPayload> {
    if (cardId !== PHI_CORE_UPTIME_CARD_ID) {
      throw new Error(`Unknown Core Dashboard card "${cardId}".`);
    }
    const labels = await readLabels(context);
    return {
      cardId,
      value: formatUptime(process.uptime()),
      description: labels.uptime_description,
      meta: labels.uptime_meta,
      error: null,
      resolvedAt: new Date().toISOString(),
    };
  },
};
