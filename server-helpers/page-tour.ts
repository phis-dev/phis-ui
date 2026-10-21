import "server-only";

import { getPhiTourWidgetLabels } from "../components/widgets/label-sets/tour";
import { PHI_SHARED_PACKAGE_NAME } from "../constants/package";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";
import type { PhiRuntimeModuleId } from "../types/cms-module-descriptors";
import type { PhiResolvedPageTour, PhiTourDefinition } from "../types/tours";
import { trBulkForLocale, trGlobalBulkForLocale } from "./translate";

/** A Tour this package ships, whose words are the same on every Site. */
function isPhiBuiltInTour(ownerModuleId: PhiRuntimeModuleId) {
  return ownerModuleId.startsWith(`${PHI_SHARED_PACKAGE_NAME}/`);
}

/**
 * A Page's Tour in the viewer's language: every step's words translated, and the step buttons from Core's
 * label set. Addresses, keys and step signals are not words and pass through.
 *
 * Where the words are kept depends on who wrote them. A built-in Tour's text is this package's, the same
 * on every Site, so it is translated once in the global set. A third-party Module's Tour is translated per
 * Site from the language that Module writes in, where the Site's own corrections apply. Either way the
 * Tour's id is the context, so a translator sees which Tour a sentence belongs to.
 */
export async function resolvePhiPageTour({
  definition,
  ownerModuleId,
  sourceLocale,
  locale,
}: {
  definition: PhiTourDefinition;
  ownerModuleId: PhiRuntimeModuleId;
  sourceLocale?: string;
  locale: string;
}): Promise<PhiResolvedPageTour> {
  const texts = definition.steps.flatMap((step) => [step.title, step.description ?? ""]);
  const translate = isPhiBuiltInTour(ownerModuleId)
    ? trGlobalBulkForLocale(locale, texts, definition.id)
    : trBulkForLocale(locale, texts, definition.id, "text", sourceLocale);
  const credentials = readPhiServerApiCredentials();
  const [labels, translated] = await Promise.all([
    getPhiTourWidgetLabels({ apiBaseUrl: credentials.apiBaseUrl, internalToken: credentials.internalToken, locale }),
    translate,
  ]);
  return {
    id: definition.id,
    version: definition.version,
    steps: definition.steps.map((step, index) => ({
      ...step,
      title: translated[index * 2] ?? step.title,
      ...(step.description ? { description: translated[index * 2 + 1] ?? step.description } : {}),
    })),
    labels: { next: labels.next, previous: labels.previous, finish: labels.finish },
  };
}
