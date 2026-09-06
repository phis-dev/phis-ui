import type { PhiCmsConfigField } from "../types/cms-plugins";

/**
 * What a Widget's own declaration already knows, checked before a value is written.
 *
 * The vocabulary of a setting is stated once, in the field that renders its control -- a `choice`
 * carries its options, a `number` its bounds. So the same declaration that draws the picker can say
 * whether a value belongs, and neither the Widget nor a second schema has to repeat it.
 *
 * This runs on the write path, in the Inspector, because that is the only place a bad value can
 * enter: a control renders from these options, so a person clicking through the Builder cannot
 * produce one, and what remains is a patch written in code. Reading stays forgiving -- a stored page
 * that renders is worth more than one that refuses -- but nothing gets stored that the declaration
 * cannot account for.
 *
 * Only what the declaration decides is decided here. A `padding` or a `background` is a structure
 * with its own parser, and guessing at it from a field type would be a second, worse validator.
 */

function optionValues(field: Extract<PhiCmsConfigField, { type: "choice" }>) {
  const values = (field.options ?? []).map((option) => option.value);
  return field.emptyOption ? [...values, field.emptyOption.value] : values;
}

function describe(value: unknown) {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

export function readPhiCmsConfigFieldViolation(
  field: PhiCmsConfigField,
  value: unknown,
): string | null {
  // Absent is not wrong. A key nobody wrote leaves the decision to the Widget's own defaults, and
  // clearing a setting has to stay possible.
  if (value === undefined || value === null) return null;

  switch (field.type) {
    case "boolean":
      return typeof value === "boolean" ? null : `${field.key} must be true or false, not ${describe(value)}.`;

    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return `${field.key} must be a number, not ${describe(value)}.`;
      }
      if (field.min !== undefined && value < field.min) {
        return `${field.key} must be at least ${field.min}, not ${value}.`;
      }
      if (field.max !== undefined && value > field.max) {
        return `${field.key} must be at most ${field.max}, not ${value}.`;
      }
      return null;
    }

    case "choice": {
      /*
       * Only a closed list can be checked. A field whose options are fetched, or which accepts what
       * somebody types, has no list to be outside of -- and pretending otherwise here would refuse
       * perfectly good values on a slow connection.
       */
      if (field.optionsProvider || field.allowCustom || field.createBehavior === "accept-custom") {
        return null;
      }
      const allowed = optionValues(field);
      if (allowed.length === 0) return null;

      const candidates = Array.isArray(value) ? value : [value];
      const stray = candidates.find((candidate) => !(allowed as unknown[]).includes(candidate));
      return stray === undefined
        ? null
        : `${field.key} must be one of ${allowed.join(", ")}, not ${describe(stray)}.`;
    }

    default:
      return null;
  }
}

export function findPhiCmsConfigViolations(
  fields: readonly PhiCmsConfigField[],
  config: Record<string, unknown>,
): string[] {
  return fields.flatMap((field) => {
    if (!Object.prototype.hasOwnProperty.call(config, field.key)) return [];
    const violation = readPhiCmsConfigFieldViolation(field, config[field.key]);
    return violation ? [violation] : [];
  });
}

/**
 * The write itself, refused loudly.
 *
 * A Builder that swallows a rejected edit is the thing this was built to avoid: the setting simply
 * does not take, and nothing says why. A throw reaches the console with the field named, and the
 * edit visibly does not apply.
 */
export function assertPhiCmsConfigFields(
  fields: readonly PhiCmsConfigField[],
  config: Record<string, unknown>,
  label: string,
): void {
  const violations = findPhiCmsConfigViolations(fields, config);
  if (violations.length > 0) {
    throw new Error(`Invalid ${label} configuration. ${violations.join(" ")}`);
  }
}
