import type { PhiFormDescriptor } from "@phis/contracts/forms";

import { readPhiFlagsFieldConfig } from "./flags-field";
import { readPhiMoneyFieldConfig } from "./money-field";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "./form-provider-contract";

/**
 * What a Form's fields break of the rules their Controls read them by, as messages, checked where the
 * Form is made (owner, 2026-11-24) rather than when a Control throws on a live page:
 *
 * - a `money` field's config: exactly one of `currency`, `currencies`, `currencyField` or an
 *   `optionsProvider`, every currency stated an ISO 4217 code a payment accepts, the bounds whole minor
 *   units (`readPhiMoneyFieldConfig`); and a `currencyField` naming another field of the same Form;
 * - a `flags` field with options written out: each option's value a bit, none twice, and `requires`
 *   naming two of its options (`readPhiFlagsFieldConfig`). Options an Options Provider answers are only
 *   known once it answers, and are read by the Control then;
 * - an `emptyOption` only on a `select` field: the one Control that draws it, last after a line, and
 *   turns choosing it into no value (FORMS.md, "The empty option"). Any other would leave it undrawn.
 * - a `derive` only on a field that holds a text -- `text` or `hidden` of Core's types -- since a proposal
 *   is a slug (FORMS.md, "Derived fields"). That `from` names another field, one that derives nothing and,
 *   for `optionLabel`, one with options, is the contract's own parser's (`parsePhiFormDescriptor`).
 *   A field type of a Module is not judged here: only that Module knows what its field holds.
 *
 * A validation rule naming a Provider nobody declares is refused by catalog construction, which knows
 * the Area's Providers (`plugins/runtime-modules/resolver.ts`); this check knows only the descriptor.
 * It runs at verify time, from `checkPhiPresetForms` (`@phis/ui/module/page-check`) in a package's tests
 * and phis-ui's own: a Site never loads it, and the Controls still read their configs strictly.
 */
const CORE_FIELD_PROVIDER_KEYS: ReadonlySet<string> = new Set(Object.values(PHI_FORM_FIELD_PROVIDER_KEYS));
const DERIVED_TEXT_FIELD_PROVIDER_KEYS: ReadonlySet<string> = new Set([
  PHI_FORM_FIELD_PROVIDER_KEYS.text,
  PHI_FORM_FIELD_PROVIDER_KEYS.hidden,
]);

export function checkPhiFormDescriptorFields(descriptor: Pick<PhiFormDescriptor, "fields">): string[] {
  const findings: string[] = [];
  const keys = new Set(descriptor.fields.map((field) => field.key));
  for (const field of descriptor.fields) {
    const where = `Field "${field.key}"`;
    if (field.emptyOption && field.fieldProviderKey !== PHI_FORM_FIELD_PROVIDER_KEYS.select) {
      findings.push(`${where} declares an emptyOption, which only a select field draws.`);
    }
    if (field.derive && CORE_FIELD_PROVIDER_KEYS.has(field.fieldProviderKey) &&
      !DERIVED_TEXT_FIELD_PROVIDER_KEYS.has(field.fieldProviderKey)) {
      findings.push(`${where} derives a slug, which only a text or hidden field holds.`);
    }
    try {
      if (field.fieldProviderKey === PHI_FORM_FIELD_PROVIDER_KEYS.money) {
        const money = readPhiMoneyFieldConfig(field.config, { hasOptionsProvider: field.optionsProvider != null });
        if (money.currencyField !== undefined && (money.currencyField === field.key || !keys.has(money.currencyField))) {
          findings.push(`${where} takes its currency from "${money.currencyField}", which is no other field of its Form.`);
        }
      } else if (field.fieldProviderKey === PHI_FORM_FIELD_PROVIDER_KEYS.flags && field.options && !field.optionsProvider) {
        readPhiFlagsFieldConfig(field.config, field.options);
      }
    } catch (error) {
      findings.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return findings;
}
