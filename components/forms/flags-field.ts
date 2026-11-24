import type { PhiControlOption } from "../controls/phi-control-options";
import { isPhiRecord } from "../../helpers/is-record";

/**
 * The `flags` field: several yes-or-no answers held as one bit-flag number, the shape every yes-or-no
 * state of a Core contract has. Each option's `value` is its bit, written as the decimal number
 * (`"1"`, `"2"`, `"4"`, ...); the value is the sum of the bits checked, `0` for none. `config.requires`
 * names, by option value, the option an option needs: it is offered only while that one is checked and
 * is cleared when it is unchecked -- a default only for a purpose the address has.
 */
export type PhiFlagsFieldConfig = {
  bits: ReadonlyMap<string, number>;
  requires: ReadonlyMap<number, number>;
};

function readBit(value: string, where: string) {
  const bit = /^[1-9][0-9]*$/u.test(value) ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(bit) || (bit & (bit - 1)) !== 0) {
    throw new Error(`The flags field ${where} "${value}" is no bit: an option's value is a power of two as a decimal number.`);
  }
  return bit;
}

/** The field's bits and dependencies, or an Error naming what is wrong: a field nobody can read the value of is refused. */
export function readPhiFlagsFieldConfig(
  config: Readonly<Record<string, unknown>> | undefined,
  options: readonly Pick<PhiControlOption, "value">[],
): PhiFlagsFieldConfig {
  const bits = new Map<string, number>();
  let all = 0;
  for (const option of options) {
    const bit = readBit(option.value, "option");
    if ((all & bit) !== 0) throw new Error(`The flags field names the bit ${bit} twice.`);
    all |= bit;
    bits.set(option.value, bit);
  }
  const requires = new Map<number, number>();
  const stated = config?.requires;
  if (stated !== undefined) {
    if (!isPhiRecord(stated)) {
      throw new Error("The flags field's requires is no map of option values.");
    }
    for (const [dependent, needed] of Object.entries(stated)) {
      const dependentBit = bits.get(dependent);
      const neededBit = typeof needed === "string" ? bits.get(needed) : undefined;
      if (dependentBit === undefined || neededBit === undefined || dependentBit === neededBit) {
        throw new Error(`The flags field's requires names "${dependent}" -> "${String(needed)}", which are not two of its options.`);
      }
      requires.set(dependentBit, neededBit);
    }
  }
  return { bits, requires };
}

/** The value as a number of the field's bits: anything else is none, and bits it does not offer are kept. */
export function readPhiFlagsFieldValue(value: unknown): number {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : 0;
}

/**
 * The value after a change of the checked options: the bits of those checked set, the field's other bits
 * cleared, an option whose required one is not set cleared with it, and bits the field does not offer
 * kept as they were.
 */
export function writePhiFlagsFieldValue(
  config: PhiFlagsFieldConfig,
  previous: number,
  checked: readonly string[],
): number {
  let offered = 0;
  for (const bit of config.bits.values()) offered |= bit;
  let next = previous & ~offered;
  for (const value of checked) next |= config.bits.get(value) ?? 0;
  for (const [dependent, needed] of config.requires) {
    if ((next & needed) === 0) next &= ~dependent;
  }
  return next;
}
