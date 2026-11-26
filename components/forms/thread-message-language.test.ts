import { describe, expect, it } from "vitest";

import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../constants/core-data-provider-keys";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "./form-provider-contract";
import { PHI_SITE_LOCALES_CONFIG_KEY } from "./site-locales-config";
import { parsePhiFormDescriptor } from "./form-descriptor-contract";
import {
  PHI_THREAD_MESSAGE_SOURCE_LANG_FIELD_KEY,
  buildPhiThreadMessageFormConfig,
  phiThreadMessageSourceLangField,
  resolvePhiThreadMessageSourceLang,
} from "./thread-message-language";

function runtime(preferredLocale: string | null, current = "en") {
  return {
    site: {
      availableLocales: [{ code: "de", label: "Deutsch" }, { code: "en", label: "English" }],
    },
    locale: { current },
    viewer: { preferredLocale },
  } as unknown as Parameters<typeof resolvePhiThreadMessageSourceLang>[0];
}

/** What every Form that writes a message is handed: the Site's languages, opened on the writer's own. */
describe("the message language a placement hands its Form", () => {
  it("opens on the writer's own language where the Site offers it", () => {
    expect(resolvePhiThreadMessageSourceLang(runtime("de", "en"))).toBe("de");
  });

  it("opens on the page's language where the writer set none, or one the Site does not run", () => {
    expect(resolvePhiThreadMessageSourceLang(runtime(null, "en"))).toBe("en");
    expect(resolvePhiThreadMessageSourceLang(runtime("  ", "de"))).toBe("de");
    expect(resolvePhiThreadMessageSourceLang(runtime("fr", "de"))).toBe("de");
  });

  it("opens on \"Other language\", no value, where neither the writer's nor the page's language is one the Site offers", () => {
    expect(resolvePhiThreadMessageSourceLang(runtime("fr", "it"))).toBeUndefined();
    expect(resolvePhiThreadMessageSourceLang(runtime(null, "it"))).toBeUndefined();
    // No initial value at all, rather than one that says nothing: the picker opens on its empty option.
    expect(buildPhiThreadMessageFormConfig(runtime("fr", "it"), { internalAllowed: true })).toEqual({
      [PHI_SITE_LOCALES_CONFIG_KEY]: [{ code: "de", label: "Deutsch" }, { code: "en", label: "English" }],
      initialValues: { internalAllowed: true },
    });
  });

  it("offers the Site's languages and keeps the placement's other initial values", () => {
    expect(buildPhiThreadMessageFormConfig(runtime("de"), { internalAllowed: true })).toEqual({
      [PHI_SITE_LOCALES_CONFIG_KEY]: [{ code: "de", label: "Deutsch" }, { code: "en", label: "English" }],
      initialValues: { internalAllowed: true, [PHI_THREAD_MESSAGE_SOURCE_LANG_FIELD_KEY]: "de" },
    });
  });

  it("is the Site locale select under the name Core's routes take it by", () => {
    const field = phiThreadMessageSourceLangField(
      { kind: "label", key: "language", fallback: "Written in" },
      { kind: "label", key: "languageOther", fallback: "Other language" },
    );
    expect(field).toEqual({
      key: "sourceLang",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: { kind: "label", key: "language", fallback: "Written in" },
      optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteLocales },
      // Its empty option: last, after a line; chosen, the Form submits no language and Core stores NULL.
      emptyOption: { label: { kind: "label", key: "languageOther", fallback: "Other language" } },
    });
    // A field the contract takes as it is, the empty option with it.
    expect(parsePhiFormDescriptor({ schemaVersion: 1, key: "reply", fields: [field] }).fields[0]?.emptyOption)
      .toEqual(field.emptyOption);
  });
});
