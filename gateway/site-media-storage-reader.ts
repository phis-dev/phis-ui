import { createPhiResponseReader, requirePhiField } from "../components/widgets/config/strict-config-reader";

/*
 * The storage settings as the server sends them, read on either side: the settings page reads them for
 * its initial values on the server, the profile choices read them in the browser.
 */

/** Where the Site's Spaces write, among the Storage Profiles the operator created. */
export type PhiSiteMediaStorageSettings = {
  profiles: readonly { id: number; key: string; providerId: string; local: boolean; disabled: boolean; spaces: number }[];
  siteSpaceProfileId: number;
  /** `null` is the Site's Local Profile. */
  defaultUserProfileId: number | null;
  defaultGroupProfileId: number | null;
  /** Empty offers every Profile. */
  allowedProfileIds: readonly number[];
};

/** Read, not cast: every field of the storage settings, or a throw naming the one that is wrong. */
export function readPhiSiteMediaStorageSettings(value: unknown, source: string): PhiSiteMediaStorageSettings {
  const reader = createPhiResponseReader(value, source);
  const id = (key: string) => requirePhiField(reader, key, "a Storage Profile id", reader.integer);
  const nullableId = (key: string) => (reader.record[key] === null ? null : id(key));
  const ids = (key: string) => requirePhiField(reader, key, "a list of Storage Profile ids", (field) =>
    reader.value(field, "a list of Storage Profile ids", (value) =>
      Array.isArray(value) && value.every((entry) => Number.isSafeInteger(entry) && entry > 0)
        ? value as number[]
        : undefined));
  return {
    profiles: requirePhiField(reader, "profiles", "the Storage Profiles", (key) => reader.list(key, (profile) => ({
      id: requirePhiField(profile, "id", "an id", profile.integer),
      key: requirePhiField(profile, "key", "a key", profile.string),
      providerId: requirePhiField(profile, "providerId", "a provider id", profile.string),
      local: requirePhiField(profile, "local", "true or false", profile.boolean),
      disabled: requirePhiField(profile, "disabled", "true or false", profile.boolean),
      spaces: requirePhiField(profile, "spaces", "a count", profile.integer),
    }))),
    siteSpaceProfileId: id("siteSpaceProfileId"),
    defaultUserProfileId: nullableId("defaultUserProfileId"),
    defaultGroupProfileId: nullableId("defaultGroupProfileId"),
    allowedProfileIds: ids("allowedProfileIds"),
  };
}
