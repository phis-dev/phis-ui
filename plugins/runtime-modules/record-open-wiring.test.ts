import { describe, expect, it } from "vitest";

import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../types/signals";
import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import { resolvePhiWidgetSignalEndpoints } from "../../components/widgets/signals/signal-endpoints";
import { PHI_FORM_WIDGET_DEFINITION } from "./core/widgets/form/config";
import { PHI_COLLECTION_VIEW_WIDGET_DEFINITION } from "./core/widgets/collection-view/config";
import { phiSignalCapabilitiesMatch } from "./builder/signal-wiring-options";

/** A record-bound Form opened from a Collection View's item (FORMS.md, "A record opened from a Collection View"). */
describe("the Builder's wiring", () => {
  it("offers a Form's recordOpen to a Collection View's item action, under collection-action only", () => {
    const blockId = "EQEXTckA4RzIwceA" as PhiCmsInstanceId;
    const view = resolvePhiWidgetSignalEndpoints({ blockId, runtimeSignals: PHI_COLLECTION_VIEW_WIDGET_DEFINITION.runtimeSignals });
    const form = resolvePhiWidgetSignalEndpoints({ blockId, runtimeSignals: PHI_FORM_WIDGET_DEFINITION.runtimeSignals });
    const output = view[0]!.emits.find((capability) => capability.id === "actionActivate")!;
    const inputs = form[0]!.listens.filter((input) => phiSignalCapabilitiesMatch(output, input));
    expect(inputs.map((input) => [input.id, input.valueSchema])).toEqual([["recordOpen", PHI_SIGNAL_VALUE_SCHEMAS.collectionAction]]);
  });
});
