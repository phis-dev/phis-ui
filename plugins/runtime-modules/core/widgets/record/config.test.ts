import { describe, expect, it } from "vitest";

import { validatePhiRecordWidgetBinding } from "../../../../../helpers/record-widget";
import { assertPhiSignalPluginMetaContract } from "../../../../../types/signals";
import type { PhiTableProviderResourceDescriptor } from "../../../../../types/table-widget";
import { PHI_RECORD_WIDGET_DEFINITION } from "./config";

const parse = (config: Record<string, unknown>) => PHI_RECORD_WIDGET_DEFINITION.parseConfig(config);

/** A resource with an act of every scope, and one that cannot be undone. */
const resource: Pick<PhiTableProviderResourceDescriptor, "resourceKey" | "actions"> = {
  resourceKey: "products",
  actions: [
    { key: "release", title: "Release", scope: "row", intent: "write", confirmation: "required" },
    { key: "lock", title: "Lock", scope: "row", intent: "destructive", confirmation: "required" },
    { key: "purge", title: "Purge", scope: "selection", intent: "destructive" },
    { key: "import", title: "Import", scope: "resource", intent: "write" },
  ],
};

/** The record Widget's actions and its title from the record (TABLES.md, "The record Widget"). */
describe("the record Widget's config", () => {
  it("takes no actions and no title unless the placement names them", () => {
    expect(PHI_RECORD_WIDGET_DEFINITION.defaultConfig.actions).toEqual([]);
    expect(PHI_RECORD_WIDGET_DEFINITION.defaultConfig).not.toHaveProperty("titleFromRecord");
    expect(parse({})).toMatchObject({ actions: [], titleFromRecord: null });
  });

  it("reads each action with its mode and question", () => {
    expect(parse({
      actions: [
        { key: " release " },
        { key: "lock", mode: "danger", confirm: { title: "Lock %1?", description: "No one acquires it.", okText: "Lock" } },
      ],
    }).actions).toEqual([
      { key: "release", mode: "normal" },
      {
        key: "lock",
        mode: "danger",
        confirm: { title: "Lock %1?", description: "No one acquires it.", okText: "Lock", cancelText: undefined },
      },
    ]);
  });

  it("refuses an action stated wrong rather than dropping it", () => {
    expect(() => parse({ actions: [{ mode: "danger" }] })).toThrow(/actions\[0\]\.key/u);
    expect(() => parse({ actions: [{ key: "release", mode: "primary" }] })).toThrow(/actions\[0\]\.mode/u);
    expect(() => parse({ actions: [{ key: "lock", confirm: { description: "Sure?" } }] })).toThrow(/confirm\.title/u);
    expect(() => parse({ actions: "release" })).toThrow(/actions/u);
  });

  it("reads the title's sentence and field, and refuses one without exactly one %1", () => {
    expect(parse({ titleFromRecord: { template: " Terms: %1 ", field: " id " } }).titleFromRecord)
      .toEqual({ template: "Terms: %1", field: "id" });
    expect(() => parse({ titleFromRecord: "Terms: %1" })).toThrow(/is no \{ template, field \}/u);
    expect(() => parse({ titleFromRecord: { template: "Terms: %1" } })).toThrow(/field must name/u);
    for (const template of ["Terms", "Terms: %1 %1", "Terms: %2", "%1 of %2"]) {
      expect(() => parse({ titleFromRecord: { template, field: "id" } })).toThrow(/%1 exactly once/u);
    }
  });

  it("answers a press on action/activate as a string, beside the row on action/activate as JSON", () => {
    const { listens, emits } = PHI_RECORD_WIDGET_DEFINITION.runtimeSignals;
    expect(() => assertPhiSignalPluginMetaContract(PHI_RECORD_WIDGET_DEFINITION.runtimeSignals, "record")).not.toThrow();
    expect(listens.find((input) => input.id === "actionActivate"))
      .toEqual({ id: "actionActivate", channel: "action", action: "activate", valueType: "string" });
    expect(emits.map((output) => [output.id, output.action, output.valueType])).toEqual([
      ["actionSuccess", "activate", "json"],
      ["recordTitle", "change", "string"],
    ]);
  });
});

describe("the record Widget's actions against its resource", () => {
  it("holds an action of the resource's rows, a destructive one drawn as danger", () => {
    expect(validatePhiRecordWidgetBinding(parse({ actions: [{ key: "release" }, { key: "lock", mode: "danger" }] }), resource))
      .toEqual([]);
  });

  it("needs no question where the resource requires one: the record shown and the press beside it are that", () => {
    expect(validatePhiRecordWidgetBinding(parse({ actions: [{ key: "release" }] }), resource)).toEqual([]);
  });

  it("refuses an action the resource does not declare, of another scope, named twice, or a destructive one drawn plain", () => {
    expect(validatePhiRecordWidgetBinding(parse({
      actions: [{ key: "archive" }, { key: "purge", mode: "danger" }, { key: "import" }, { key: "lock" }, { key: "release" }, { key: "release" }],
    }), resource)).toEqual([
      'Record action "archive" is not declared by resource "products".',
      'Record action "purge" cannot run on a record: its scope is "selection".',
      'Record action "import" cannot run on a record: its scope is "resource".',
      'Destructive Record action "lock" requires danger presentation.',
      'Record action "release" is configured more than once.',
    ]);
  });
});
