import { describe, expect, it } from "vitest";

import { isPhiInspectorConfigFieldVisible } from "./builder/clients/inspector-config-field";
import { PHI_SIMPLE_TEXT_WIDGET_DEFINITION } from "./core/widgets/simple-text/config";

/*
 * Simple Text's tone as the Builder's Inspector shows it: two declarations of one field, each visible in
 * one state, which is a Core Widget read through the Builder's field rules -- hence beside the module
 * system rather than in either Module.
 */
const fields = PHI_SIMPLE_TEXT_WIDGET_DEFINITION.fields;

describe("Simple Text's tone beside a colour of its own", () => {
  const visibleTone = (config: Record<string, unknown>) =>
    fields.filter((field) => field.key === "tone" && isPhiInspectorConfigFieldVisible(field, config));

  it("reads Custom while a colour is set, and a tone chosen there drops the colour", () => {
    const [shown] = visibleTone({ color: "#ff0000" });
    expect(visibleTone({ color: "#ff0000" })).toHaveLength(1);
    expect(shown).toMatchObject({ emptyOption: { value: "custom", label: "Custom" }, patchOnChange: { color: undefined } });
  });

  it("offers the tones with a default line while no colour is set", () => {
    const shown = visibleTone({});
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ emptyOption: { value: "default", label: "Default" } });
    expect(shown[0]).not.toHaveProperty("patchOnChange");
  });
});

