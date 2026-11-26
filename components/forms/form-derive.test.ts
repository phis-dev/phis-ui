import { describe, expect, it } from "vitest";

import type { PhiFormFieldDescriptor } from "@phis/contracts/forms";

import { resolvePhiFormDerivedProposals } from "./form-derive";

/* A derived field proposes, and never overwrites (FORMS.md, "Derived fields"). */

const name = { key: "name", fieldProviderKey: "@phis/ui/forms/field/text" } as PhiFormFieldDescriptor;
const kind = { key: "kind", fieldProviderKey: "@phis/ui/forms/field/select" } as PhiFormFieldDescriptor;
const slug = (source: "value" | "optionLabel", from: string) => ({
  key: "slug",
  fieldProviderKey: "@phis/ui/forms/field/text",
  derive: { from, source, transform: "slug" },
}) as PhiFormFieldDescriptor;

const propose = (
  field: PhiFormFieldDescriptor,
  changed: Record<string, unknown>,
  values: Record<string, unknown>,
  lastProposals: Map<string, string> = new Map(),
) => resolvePhiFormDerivedProposals({
  fields: [name, kind, field],
  changed,
  values,
  lastProposals,
  optionLabel: (fieldKey, value) => (fieldKey === "kind" && value === 2 ? "Größere Häuser" : undefined),
});

describe("resolvePhiFormDerivedProposals", () => {
  it("proposes the slug of its source while the field is empty", () => {
    expect(propose(slug("value", "name"), { name: "Private Cloud" }, { name: "Private Cloud" }))
      .toEqual({ slug: "private-cloud" });
    expect(propose(slug("value", "name"), { name: "Straße" }, { name: "Straße", slug: "" }))
      .toEqual({ slug: "strasse" });
  });

  it("follows its source while the field still holds the last proposal it took", () => {
    const last = new Map([["slug", "private"]]);
    expect(propose(slug("value", "name"), { name: "Private C" }, { name: "Private C", slug: "private" }, last))
      .toEqual({ slug: "private-c" });
  });

  it("never overwrites what somebody wrote, and lets proposals back in once it is emptied", () => {
    const last = new Map([["slug", "private"]]);
    expect(propose(slug("value", "name"), { name: "Private C" }, { name: "Private C", slug: "my-own" }, last)).toEqual({});
    expect(propose(slug("value", "name"), { name: "Private C" }, { name: "Private C", slug: "stored" })).toEqual({});
    expect(propose(slug("value", "name"), { name: "Private C" }, { name: "Private C", slug: null }, last))
      .toEqual({ slug: "private-c" });
  });

  it("asks only when its source changed, and a value that is no text or number proposes nothing", () => {
    expect(propose(slug("value", "name"), { other: 1 }, { name: "Private Cloud" })).toEqual({});
    expect(propose(slug("value", "name"), { name: true }, { name: true })).toEqual({});
    expect(propose(slug("value", "name"), { name: 42 }, { name: 42 })).toEqual({ slug: "42" });
  });

  it("reads the chosen option's label for `optionLabel`, and nothing chosen proposes nothing", () => {
    expect(propose(slug("optionLabel", "kind"), { kind: 2 }, { kind: 2 })).toEqual({ slug: "groessere-haeuser" });
    expect(propose(slug("optionLabel", "kind"), { kind: null }, { kind: null })).toEqual({});
    expect(propose(slug("optionLabel", "kind"), { kind: 9 }, { kind: 9 })).toEqual({});
  });
});
