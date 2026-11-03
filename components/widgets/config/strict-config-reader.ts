import { isPhiRecord } from "../../../helpers/is-record";

/*
 * Reading a Widget's or Layout's stored config strictly.
 *
 * A value that is absent -- `undefined`, `null`, or an empty text -- is allowed and reads as absent; the
 * parser decides what absent means. A value that is present and wrong is an error, never a silent
 * `undefined` or a default put in its place: a config that says something the Widget cannot read is a
 * config somebody has to correct, and they can only do that if it is said.
 *
 * The error names where it is (`columns[2].sizing.width`), what was expected and what was found. It is
 * thrown from `parseConfig`; the renderer catches it per block (`phi-cms-layout-renderer.tsx`), so a live
 * page leaves the one Widget out and logs it, while the Builder and the preview show it in the Widget's
 * place, where the field can be corrected.
 */
export class PhiConfigError extends Error {
  readonly path: string;
  readonly expected: string;
  readonly received: unknown;

  constructor(path: string, expected: string, received: unknown) {
    super(`Config field "${path}" expects ${expected}, found ${describePhiConfigValue(received)}.`);
    this.name = "PhiConfigError";
    this.path = path;
    this.expected = expected;
    this.received = received;
  }
}

export function isPhiConfigError(error: unknown): error is PhiConfigError {
  return error instanceof PhiConfigError;
}

/** The render issue code for an error: a config nobody can read is said as such, not as a crash. */
export function resolvePhiRenderFailureCode(error: unknown): "invalid-config" | "render-failed" {
  return error instanceof PhiConfigError || (error instanceof Error && error.name === "PhiConfigError")
    ? "invalid-config"
    : "render-failed";
}

function describePhiConfigValue(value: unknown) {
  if (Array.isArray(value)) return "a list";
  if (isPhiRecord(value)) return "an object";
  if (typeof value === "string") return `the text ${JSON.stringify(value.length > 40 ? `${value.slice(0, 40)}...` : value)}`;
  return `${typeof value} ${String(value)}`;
}

function isAbsent(value: unknown) {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

export type PhiConfigReader = {
  /** Where this reader stands, for nested readers and errors. */
  readonly path: string;
  readonly record: Readonly<Record<string, unknown>>;
  has(key: string): boolean;
  string(key: string): string | undefined;
  number(key: string): number | undefined;
  integer(key: string): number | undefined;
  boolean(key: string): boolean | undefined;
  /** One of a closed list of values. */
  oneOf<const T extends string | number>(key: string, values: readonly T[]): T | undefined;
  /** A value a reader of the caller's checks; `read` answers `undefined` for a value it does not accept. */
  value<T>(key: string, expected: string, read: (value: unknown) => T | undefined): T | undefined;
  /** A nested object, read by a reader of its own. */
  object<T>(key: string, read: (reader: PhiConfigReader) => T): T | undefined;
  /** A list of objects, each read by a reader of its own. */
  list<T>(key: string, read: (reader: PhiConfigReader, index: number) => T): T[] | undefined;
  /** A list of texts. */
  stringList(key: string): string[] | undefined;
  /** An error at a field of this reader, for a rule the field types cannot state. */
  fail(key: string, expected: string, received?: unknown): never;
};

export function createPhiConfigReader(
  record: Readonly<Record<string, unknown>>,
  path = "",
): PhiConfigReader {
  const at = (key: string) => (path ? `${path}.${key}` : key);
  const fail = (key: string, expected: string, received: unknown = record[key]): never => {
    throw new PhiConfigError(at(key), expected, received);
  };
  const reader: PhiConfigReader = {
    path,
    record,
    has: (key) => !isAbsent(record[key]),
    string(key) {
      const value = record[key];
      if (isAbsent(value)) return undefined;
      return typeof value === "string" ? value : fail(key, "a text");
    },
    number(key) {
      const value = record[key];
      if (isAbsent(value)) return undefined;
      return typeof value === "number" && Number.isFinite(value) ? value : fail(key, "a number");
    },
    integer(key) {
      const value = record[key];
      if (isAbsent(value)) return undefined;
      return typeof value === "number" && Number.isInteger(value) ? value : fail(key, "a whole number");
    },
    boolean(key) {
      const value = record[key];
      if (isAbsent(value)) return undefined;
      return typeof value === "boolean" ? value : fail(key, "true or false");
    },
    oneOf(key, values) {
      const value = record[key];
      if (isAbsent(value)) return undefined;
      return (values as readonly unknown[]).includes(value)
        ? value as (typeof values)[number]
        : fail(key, `one of ${values.map((entry) => JSON.stringify(entry)).join(", ")}`);
    },
    value(key, expected, read) {
      const value = record[key];
      if (isAbsent(value)) return undefined;
      const result = read(value);
      return result === undefined ? fail(key, expected) : result;
    },
    object(key, read) {
      const value = record[key];
      if (isAbsent(value)) return undefined;
      return isPhiRecord(value) ? read(createPhiConfigReader(value, at(key))) : fail(key, "an object");
    },
    list(key, read) {
      const value = record[key];
      if (isAbsent(value)) return undefined;
      if (!Array.isArray(value)) return fail(key, "a list");
      return value.map((entry, index) => {
        const entryPath = `${at(key)}[${index}]`;
        if (!isPhiRecord(entry)) throw new PhiConfigError(entryPath, "an object", entry);
        return read(createPhiConfigReader(entry, entryPath), index);
      });
    },
    stringList(key) {
      const value = record[key];
      if (isAbsent(value)) return undefined;
      if (!Array.isArray(value)) return fail(key, "a list of texts");
      return value.map((entry, index) => {
        if (typeof entry !== "string") throw new PhiConfigError(`${at(key)}[${index}]`, "a text", entry);
        return entry;
      });
    },
    fail,
  };
  return reader;
}
