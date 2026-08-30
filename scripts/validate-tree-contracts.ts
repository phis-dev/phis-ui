import assert from "node:assert/strict";

import { parsePhiTreeWidgetConfig } from "../plugins/runtime-modules/core/widgets/tree/config";

const presentation = parsePhiTreeWidgetConfig({
  presentation: {
    title: "Structure",
    description: "Visible nodes",
    bordered: true,
    row: { striped: true },
    node: { titleFieldKey: "label", descriptionFieldKey: "path" },
  },
}).presentation;

assert.equal(presentation.title, "Structure");
assert.equal(presentation.description, "Visible nodes");
assert.equal(presentation.bordered, true);
assert.equal(presentation.row?.striped, true);
assert.equal(presentation.node.titleFieldKey, "label");
assert.equal(presentation.node.descriptionFieldKey, "path");

console.log("Tree contracts valid: Widget header, Control border, and visible-row striping are declarative.");
