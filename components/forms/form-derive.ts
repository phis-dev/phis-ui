import { toPhiSlug, type PhiFormFieldDescriptor } from "@phis/contracts/forms";

/**
 * A derived field's proposals (FORMS.md, "Derived fields"; `PhiFormFieldDeriveDescriptor`): an address
 * from a name, typed once.
 *
 * Asked after every change somebody makes. A field whose `from` changed takes the new proposal while it
 * is empty or still holds the last proposal it took (`lastProposals`), and never otherwise: once somebody
 * wrote something of their own there it stays, whatever `from` becomes -- and emptying it lets the
 * proposals back in. Nothing chosen in `from`, or a value that is neither text nor number, proposes
 * nothing, and the field keeps what it holds. Pure: the caller writes what it answers and records the
 * proposals in `lastProposals` itself.
 */
export function resolvePhiFormDerivedProposals(input: {
  fields: readonly PhiFormFieldDescriptor[];
  changed: Readonly<Record<string, unknown>>;
  values: Readonly<Record<string, unknown>>;
  lastProposals: ReadonlyMap<string, string>;
  /** The label of the option holding `value` in the field `fieldKey`, as the field shows it. */
  optionLabel: (fieldKey: string, value: unknown) => string | undefined;
}): Record<string, string> {
  const proposals: Record<string, string> = {};
  for (const field of input.fields) {
    const derive = field.derive;
    if (!derive || !Object.hasOwn(input.changed, derive.from)) continue;
    const source = input.values[derive.from];
    const text = derive.source === "optionLabel"
      ? (source == null || source === "" ? undefined : input.optionLabel(derive.from, source))
      : typeof source === "string" ? source : typeof source === "number" ? String(source) : undefined;
    if (text === undefined) continue;
    const proposal = toPhiSlug(text);
    const current = input.values[field.key];
    const free = current == null || current === "" || current === input.lastProposals.get(field.key);
    if (free) proposals[field.key] = proposal;
  }
  return proposals;
}
