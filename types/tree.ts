export type PhiTreeOption<TMeta = unknown> = {
  value: string;
  label: string;
  /**
   * The quiet second line under the label, where the label alone does not say which one this is.
   *
   * A Page tree is the case it exists for: two Pages may reasonably be called "Overview", and the thing
   * that tells them apart is the address. Putting it in the label instead makes every row read like a
   * path and the title stop being one.
   */
  description?: string;
  children?: PhiTreeOption<TMeta>[];
  disabled?: boolean;
  meta?: TMeta;
};
