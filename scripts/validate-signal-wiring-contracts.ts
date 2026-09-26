import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { phiSignalCapabilitiesMatch } from "../plugins/runtime-modules/builder/signal-wiring-options";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  isPhiSignalValueSchema,
  readPhiSignalRouteSet,
  resolvePhiSignalRouteValue,
} from "../types/signals";

/**
 * What a route carries is the VALUE.
 *
 * The sender dispatches with the route's own channel, action and value type, and the route takes all
 * three from the receiver's capability. The sender's declared action names what it does, not what the
 * receiver hears, so the two need not agree -- requiring that was what left the wiring overlay's
 * receiver list empty for a Button's `activate`, the output an author reaches for first.
 */
const activate = { id: "activate", action: "activate", valueType: "none" } as const;
const command = { id: "command", action: "activate", valueType: "string" } as const;
const visibilityToggle = { id: "visibilityToggle", channel: "visibility", action: "toggle", valueType: "none" } as const;
const visibilityChange = { id: "visibility", channel: "visibility", action: "change", valueType: "enum" } as const;
const enabledChange = { id: "enabled", channel: "enabled", action: "change", valueType: "boolean" } as const;

assert.equal(
  phiSignalCapabilitiesMatch(activate, visibilityToggle),
  true,
  "A Button's activate must be able to toggle a block's visibility.",
);
assert.equal(
  phiSignalCapabilitiesMatch(activate, enabledChange),
  false,
  "An output that carries no value cannot drive a boolean input.",
);
assert.equal(
  phiSignalCapabilitiesMatch(command, visibilityChange),
  false,
  "A free string is not an enum; the receiver would drop it.",
);

/**
 * JSON is the one value family where the type alone says nothing: two schemas are two different
 * payloads, and the receiver reads only its own.
 */
const backgroundOut = {
  id: "background",
  action: "change",
  valueType: "json",
  valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.backgroundConfig,
} as const;
const backgroundIn = {
  id: "background",
  channel: "background",
  action: "change",
  valueType: "json",
  valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.backgroundConfig,
} as const;
const borderIn = {
  id: "border",
  channel: "border",
  action: "change",
  valueType: "json",
  valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.borderConfig,
} as const;

assert.equal(phiSignalCapabilitiesMatch(backgroundOut, backgroundIn), true);
assert.equal(phiSignalCapabilitiesMatch(backgroundOut, borderIn), false);
assert.equal(phiSignalCapabilitiesMatch(null, backgroundIn), false);
assert.equal(phiSignalCapabilitiesMatch(backgroundOut, null), false);

{
  /*
   * A receiver only receives what its address is registered for, in the signal's own scope. A toolbar
   * button is addressed as a subcontrol, and the identity context that used to supply that scope is
   * populated inside an Overlay and nowhere else -- so every toolbar outside one left its buttons
   * unregistered and their signals were dropped before delivery. Undo and Redo stayed clickable on an
   * empty history and did nothing when pressed. The scope a button is addressed in is declared by the
   * routes that address it.
   */
  const toolbarSource = await readFile(
    new URL("../plugins/runtime-modules/core/widgets/command-toolbar/client.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    toolbarSource,
    /scopeByAddress\.set\(route\.receiver, route\.scope\)/u,
    "A button's registered scope must come from the routes that address it.",
  );
  assert.match(
    toolbarSource,
    /scopeByAddress\.get\(address\) \?\? signalIdentity\.scope/u,
    "The identity scope may stand in where no route names one, never replace it.",
  );
}

/**
 * The stricter of the two questions asked about a value schema name.
 *
 * This side holds the Module registry, so it asks whether the package part names a Module it knows.
 * phi-server holds no such registry and must not: refusing a schema because it had never heard of the
 * package would refuse every third party's, so it asks the shape alone --
 * `isPhiSignalValueSchemaShape` in `@phis/contracts/signals`. Two different questions about one string,
 * and a wiring that passes here has to pass there.
 *
 * These are the cases `phi-server/src/lib/cms/signal-value-schema.test.ts` asserts, so a widening that
 * reaches only one of the two answers fails on the other.
 */
const ACCEPTED_VALUE_SCHEMAS = [
  "@phis/ui/modules/core/signals/message",
  "@phis/ui/modules/builder/signals/chrome",
  "@phis/ui/modules/asset/signals/selection",
  "@acme/status/modules/status/signals/service-selection",
  "@acme/status/signals/service-selection",
  "unscoped/signals/leaf",
];

const REJECTED_VALUE_SCHEMAS: readonly unknown[] = [
  "@phis/ui/background-config",
  "@acme/status/service-selection",
  "@phis/ui/modules/core/signals",
  "@phis/ui/modules/core/signals/",
  "@phis/ui/modules/core/signals/a/b",
  "signals/message",
  42,
  null,
];

for (const schema of ACCEPTED_VALUE_SCHEMAS) {
  assert.equal(isPhiSignalValueSchema(schema), true, `${schema} must be a valid value schema.`);
}
for (const schema of REJECTED_VALUE_SCHEMAS) {
  assert.equal(isPhiSignalValueSchema(schema), false, `${String(schema)} must not be a valid value schema.`);
}
for (const [name, schema] of Object.entries(PHI_SIGNAL_VALUE_SCHEMAS)) {
  assert.equal(
    isPhiSignalValueSchema(schema),
    true,
    `Declared value schema ${name} (${schema}) does not satisfy its own grammar.`,
  );
}

/**
 * A route into a Form field names the field, and nothing else may.
 *
 * The field name is an addressing fact about the wire, so it belongs beside the receiver rather than in
 * the sender's code -- which is where the focal rectangle kept it, and why that Widget could only ever
 * feed one Form. Both halves are asserted: a `form-field` route without a name cannot be delivered, and a
 * name on any other route would be read by nobody, which is the worse of the two silences.
 */
const fieldRoute = {
  routeKey: "field-route",
  capabilityId: "selectionChange",
  scope: "page",
  channel: "field",
  action: "change",
  valueType: "json",
  valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formField,
  receiver: "controller:@phis/ui/modules/core/controller/form:widget-1",
} as const;

assert.equal(
  readPhiSignalRouteSet({ emits: [fieldRoute] }),
  null,
  "A form-field route without a fieldKey must be refused.",
);
assert.equal(
  readPhiSignalRouteSet({ emits: [{ ...fieldRoute, fieldKey: "   " }] }),
  null,
  "A blank fieldKey is no field name.",
);
assert.equal(
  readPhiSignalRouteSet({ emits: [{ ...fieldRoute, fieldKey: " threadId " }] })?.emits?.[0]?.fieldKey,
  "threadId",
  "A named field survives normalization, trimmed.",
);
assert.equal(
  readPhiSignalRouteSet({
    emits: [{ ...fieldRoute, valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection, fieldKey: "threadId" }],
  }),
  null,
  "A fieldKey on a route that carries something else must be refused.",
);

/**
 * What the sender hands over, and what the route makes of it.
 *
 * The sender holds a value. Wrapping it into `{ fieldKey, value }` happens once, here, so a Widget that
 * emits the same value to a Form and to a Controller does not need to know which of the two it is talking
 * to.
 */
const namedRoute = readPhiSignalRouteSet({ emits: [{ ...fieldRoute, fieldKey: "threadId" }] })?.emits?.[0];
assert.ok(namedRoute, "The named route must parse.");
assert.deepEqual(
  resolvePhiSignalRouteValue(namedRoute, 7),
  { fieldKey: "threadId", value: 7 },
  "A route that names a field carries the form-field shape.",
);
assert.equal(
  resolvePhiSignalRouteValue({ ...namedRoute, valueType: "none" }, 7),
  null,
  "A route that carries nothing carries nothing, field name or not.",
);
const plainRoute = readPhiSignalRouteSet({
  emits: [{ ...fieldRoute, channel: "thread", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection }],
})?.emits?.[0];
assert.ok(plainRoute, "The plain route must parse.");
assert.deepEqual(
  resolvePhiSignalRouteValue(plainRoute, { threadId: 7 }),
  { threadId: 7 },
  "Without a field name the sender's value travels untouched.",
);

console.log(
  `Signal wiring compatibility contracts validated, including ${Object.keys(PHI_SIGNAL_VALUE_SCHEMAS).length} value schemas.`,
);
