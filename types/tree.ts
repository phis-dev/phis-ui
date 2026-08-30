export type PhiTreeOption<TMeta = unknown> = {
  value: string;
  label: string;
  children?: PhiTreeOption<TMeta>[];
  disabled?: boolean;
  meta?: TMeta;
};
