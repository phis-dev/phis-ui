import {
  isPhiSignalAction,
  isPhiSignalValueType,
  type PhiSignalAction,
  type PhiSignalAddress,
  type PhiSignalChannel,
  type PhiSignalValue,
  type PhiSignalValueSchema,
  type PhiSignalValueType,
} from "./signals";
import type { PhiVisualAnchorAddress } from "./visual-anchors";

/**
 * Guided Tours ([design/TOURS.md](../design/TOURS.md)).
 *
 * A Tour belongs to a Page: the Module that owns a route preset may attach one to it, the request
 * resolution translates it with the Page, and whichever Controller in the Area says it takes Page Tours
 * (`pageTour` among its flags) receives it as a Page overlay of its config. There is no registry of
 * Tours and no Tour content in the CMS.
 */

/**
 * Where a step's panel sits relative to its target. Four sides, not Ant Design's twelve: a Tour points
 * at something, and the corner variants are layout tuning no definition should have to carry.
 */
export type PhiTourPlacement = "top" | "bottom" | "left" | "right";

/** What a step does when its target is not there to point at: pass over it, or end the Tour. */
export type PhiTourMissingTargetPolicy = "skip" | "stop";

/**
 * One signal a step sends: to prepare what it points at, or to put it away again (design/TOURS.md,
 * Signaling and orchestration). An ordinary Area signal under the Tour Controller's address, to one named
 * receiver that already listens for it -- the Tour adds no channel and no receiver of its own. The value
 * travels with the Page, so it is plain data.
 */
export type PhiTourStepSignal = {
  receiver: PhiSignalAddress;
  channel: PhiSignalChannel;
  action: PhiSignalAction;
  valueType: PhiSignalValueType;
  valueSchema?: PhiSignalValueSchema;
  value?: PhiSignalValue;
};

export type PhiTourStepDefinition = {
  /** The step's identity within its Tour; progress is stored under it, never under a position. */
  key: string;
  /**
   * What the step points at, or `null` for a step that is centered on purpose. A target that is not found
   * is never turned into a centered step -- `ifMissing` decides instead.
   */
  target: PhiVisualAnchorAddress | null;
  /** In the owning Module's language; translated with the Page. */
  title: string;
  description?: string;
  placement?: PhiTourPlacement;
  ifMissing?: PhiTourMissingTargetPolicy;
  /**
   * Sent when the step is asked for, before its target is waited for: what makes the target appear --
   * selecting something so its Inspector opens, opening a slot.
   */
  prepare?: readonly PhiTourStepSignal[];
  /**
   * Sent when the step is left, however it is left: the next step, the previous one, a step passed over,
   * the Tour closed or finished, the Page left. What `prepare` opened, this puts away, so nothing a step
   * brought up stands in front of the steps after it.
   */
  release?: readonly PhiTourStepSignal[];
};

export type PhiTourDefinition = {
  /** `<module id>/<key>`: namespaced by the Module that owns the Page. */
  id: `${string}/${string}`;
  /**
   * A positive integer. Raising it is a new learning revision: whoever completed or dismissed the
   * previous one is offered the Tour again. Progress is compared with it, never with the steps.
   */
  version: number;
  steps: readonly PhiTourStepDefinition[];
};

/** The words around every Tour, from the Core label set. */
export type PhiTourLabels = {
  next: string;
  previous: string;
  finish: string;
};

/** A Tour as the Page hands it on: its texts in the viewer's language, and the buttons' words. */
export type PhiResolvedPageTour = PhiTourDefinition & {
  labels: PhiTourLabels;
};

/** The flag a Controller definition carries to receive the shown Page's Tour as `pageTour` in its config. */
export const PHI_PAGE_TOUR_CONTROLLER_FLAG = "pageTour";

/** The config key the Page's Tour arrives under. */
export const PHI_PAGE_TOUR_CONFIG_KEY = "pageTour";

const TOUR_STEP_KEY_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;

/** What is wrong with a definition, as sentences; empty when nothing is. */
export function collectPhiTourDefinitionErrors(definition: PhiTourDefinition): string[] {
  const errors: string[] = [];
  if (!/^[^/\s]+(\/[^/\s]+)+$/u.test(definition.id)) {
    errors.push(`Tour id "${definition.id}" is not namespaced as <module id>/<key>.`);
  }
  if (!Number.isInteger(definition.version) || definition.version < 1) {
    errors.push(`Tour "${definition.id}" has version ${definition.version}; it must be a positive integer.`);
  }
  if (definition.steps.length === 0) {
    errors.push(`Tour "${definition.id}" has no steps.`);
  }
  const keys = new Set<string>();
  for (const step of definition.steps) {
    if (!TOUR_STEP_KEY_PATTERN.test(step.key)) {
      errors.push(`Tour "${definition.id}" step "${step.key}" is not a lower-case key.`);
    }
    if (keys.has(step.key)) {
      errors.push(`Tour "${definition.id}" names step "${step.key}" twice.`);
    }
    keys.add(step.key);
    if (!step.title.trim()) {
      errors.push(`Tour "${definition.id}" step "${step.key}" has no title.`);
    }
    if (step.target?.startsWith("controller:")) {
      errors.push(`Tour "${definition.id}" step "${step.key}" points at a Controller, which draws nothing.`);
    }
    for (const signal of [...step.prepare ?? [], ...step.release ?? []]) {
      if ((signal.receiver as string) === "broadcast") {
        errors.push(`Tour "${definition.id}" step "${step.key}" broadcasts; a step signal names its receiver.`);
      }
      if (!isPhiSignalAction(signal.action) || !isPhiSignalValueType(signal.valueType)) {
        errors.push(`Tour "${definition.id}" step "${step.key}" sends "${signal.channel}" with an unknown action or value type.`);
      }
    }
  }
  return errors;
}

/** The addresses a Tour points at, which the render has to draw with a live frame to be found. */
export function readPhiTourTargets(tour: Pick<PhiTourDefinition, "steps"> | null | undefined) {
  return (tour?.steps ?? []).flatMap((step) => (step.target ? [step.target] : []));
}

/** A Page Tour as it arrives in a Controller's config, or `null` for anything that is not one. */
export function readPhiResolvedPageTour(value: unknown): PhiResolvedPageTour | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.version !== "number" || !Array.isArray(record.steps)) return null;
  const labels = record.labels as Record<string, unknown> | undefined;
  if (typeof labels?.next !== "string" || typeof labels.previous !== "string" || typeof labels.finish !== "string") {
    return null;
  }
  return value as PhiResolvedPageTour;
}
