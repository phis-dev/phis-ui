export type PhiResponsiveValue<TValue> = {
  compact?: TValue;
  medium?: TValue;
  wide?: TValue;
};

export type PhiResolvedResponsiveValue<TValue> = {
  compact: TValue;
  medium: TValue;
  wide: TValue;
};

export function resolvePhiResponsiveValue<TValue>(
  value: PhiResponsiveValue<TValue> | undefined,
  fallback: PhiResolvedResponsiveValue<TValue>,
): PhiResolvedResponsiveValue<TValue> {
  if (!value) return fallback;
  const compact = value.compact ?? fallback.compact;
  const medium = value.medium ?? (value.compact === undefined ? fallback.medium : compact);
  const wide = value.wide ?? (
    value.medium === undefined && value.compact === undefined ? fallback.wide : medium
  );
  return { compact, medium, wide };
}
