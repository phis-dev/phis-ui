import "server-only";

import { getPhiTourWidgetLabels } from "../components/widgets/label-sets/tour";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";
import type { PhiResolvedPageTour, PhiTourDefinition } from "../types/tours";
import { trForLocale } from "./translate";

/**
 * A Page's Tour in the viewer's language: every step's words translated from the owning Module's
 * language, and the step buttons from Core's label set. Addresses and keys are not words and pass through.
 */
export async function resolvePhiPageTour({
  definition,
  sourceLocale,
  locale,
}: {
  definition: PhiTourDefinition;
  sourceLocale?: string;
  locale: string;
}): Promise<PhiResolvedPageTour> {
  const translate = (text: string) => trForLocale(locale, text, 0, 0, "text", sourceLocale);
  const credentials = readPhiServerApiCredentials();
  const [labels, steps] = await Promise.all([
    getPhiTourWidgetLabels({ apiBaseUrl: credentials.apiBaseUrl, internalToken: credentials.internalToken, locale }),
    Promise.all(definition.steps.map(async (step) => ({
      ...step,
      title: await translate(step.title),
      ...(step.description ? { description: await translate(step.description) } : {}),
    }))),
  ]);
  return {
    id: definition.id,
    version: definition.version,
    steps,
    labels: { next: labels.next, previous: labels.previous, finish: labels.finish },
  };
}
