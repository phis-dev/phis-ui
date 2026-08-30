export function assertUniquePhiCmsRegistryKeys(
  scope: string,
  entries: readonly { key: string; namespacedTypeKey: string }[],
) {
  const seen = new Map<string, string>();

  for (const entry of entries) {
    const existing = seen.get(entry.namespacedTypeKey);
    if (existing) {
      throw new Error(
        `Duplicate ${scope} CMS type key "${entry.namespacedTypeKey}" for "${existing}" and "${entry.key}".`,
      );
    }

    seen.set(entry.namespacedTypeKey, entry.key);
  }
}
