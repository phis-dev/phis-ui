import type { Rule } from "antd/es/form";

/**
 * One validation rule as PhiFormControl applies it to a field.
 *
 * A validation provider builds these from a rule descriptor, and the form draws them through its
 * primitive. Named here so the registry that holds the providers types against the Control rather than
 * against the primitive's form library.
 */
export type PhiFormControlRule = Rule;
