import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import { getPhiBuilderModulesPageLabels } from "../../../components/widgets/label-sets/builder-modules";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../catalog";
import {
  createPhiDashboardCardId,
  type PhiDashboardCardContext,
  type PhiDashboardCardDescriptor,
  type PhiDashboardCardId,
  type PhiDashboardCardPayload,
  type PhiDashboardCardProvider,
} from "../../../types/dashboard-cards";
import { readPhiBuilderAreasWithOpenDraft } from "./area-shell-presets.server";
import { PHI_BUILDER_RUNTIME_MODULE_ID, PHI_BUILDER_RUNTIME_MODULE_IDENTITY } from "./ids";

/**
 * What is open on the Builder's Dashboard: the Areas whose structure has a draft nobody published.
 *
 * The first `list` card. A structure author opening the Builder wants to know where they left off,
 * which is a set of names rather than a count -- "Public and App" says where to go, "2" does not.
 *
 * The Area shells are read from the first-party catalog. A provider is handed no catalog, and every
 * Area's shell is contributed by its first-party base Module, so the Builder's catalog and this one name
 * the same shell sources; a Site's own Modules add Pages, not Areas.
 */

const PHI_BUILDER_DASHBOARD_CARD_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_BUILDER_RUNTIME_MODULE_IDENTITY, {
  key: "cards:builder-drafts",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    drafts_eyebrow: "Structure",
    drafts_title: "Open drafts",
    drafts_description: "Areas whose Shell or Module selection has changes that are not published",
    drafts_meta_waiting: "Publish them under Shells",
    drafts_meta_clear: "Every Area is published",
  },
});

const PHI_BUILDER_DRAFTS_CARD_ID = createPhiDashboardCardId(PHI_BUILDER_RUNTIME_MODULE_ID, "drafts");

function readTranslatorOptions(context: PhiDashboardCardContext): PhiGlobalTranslatorOptions {
  return {
    apiBaseUrl: context.apiBaseUrl,
    internalToken: context.internalToken,
    locale: context.locale,
  };
}

export const PHI_BUILDER_RUNTIME_MODULE_DASHBOARD_CARDS: PhiDashboardCardProvider = {
  async listCards(context): Promise<readonly PhiDashboardCardDescriptor[]> {
    const labels = await getPhiLabelSet(readTranslatorOptions(context), PHI_BUILDER_DASHBOARD_CARD_LABEL_SET);
    return [{
      cardId: PHI_BUILDER_DRAFTS_CARD_ID,
      form: "list",
      eyebrow: labels.drafts_eyebrow,
      title: labels.drafts_title,
      description: labels.drafts_description,
      mark: "antd:edit",
      target: {
        ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
        presetKey: "builder-shells-page",
      },
    }];
  },

  async resolveCard(cardId: PhiDashboardCardId, context): Promise<PhiDashboardCardPayload> {
    if (cardId !== PHI_BUILDER_DRAFTS_CARD_ID) {
      throw new Error(`Unknown Builder Dashboard card "${cardId}".`);
    }
    const options = readTranslatorOptions(context);
    const [labels, areaLabels, drafted] = await Promise.all([
      getPhiLabelSet(options, PHI_BUILDER_DASHBOARD_CARD_LABEL_SET),
      getPhiBuilderModulesPageLabels(options).then((page) => page.areas),
      readPhiBuilderAreasWithOpenDraft(PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG, {
        siteKey: context.siteKey,
        locale: context.locale,
        apiBaseUrl: context.apiBaseUrl,
        internalToken: context.internalToken,
      }),
    ]);
    return {
      cardId,
      // The Area's name alone: the card's title already says what is open about it.
      entries: drafted.map((area) => ({ key: area, content: areaLabels[area], tone: "warning" as const })),
      description: labels.drafts_description,
      meta: drafted.length > 0 ? labels.drafts_meta_waiting : labels.drafts_meta_clear,
      error: null,
      resolvedAt: new Date().toISOString(),
    };
  },
};
