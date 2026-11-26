import type { PhiBlockRuntime } from "../../types";
import type { PhiFormFieldDescriptor, PhiFormTextDescriptor } from "../../types/form-descriptor";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "./form-provider-contract";
import { PHI_SITE_LOCALES_CONFIG_KEY } from "./site-locales-config";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../constants/core-data-provider-keys";

/*
 * The language a message is written in, declared by whoever writes it (THREADS.md section 9).
 *
 * Here rather than in Core's messaging folder because three Modules place these Forms -- Core's reply,
 * the threads Module's new conversation, Accounting's customer file -- and none of them reaches into
 * another's folder.
 *
 * Every Form that writes a message -- the reply, the note in a customer file, opening a conversation --
 * carries this one field beside the message, and every placement of those Forms hands it the same two
 * things: the Site's languages to offer and the writer's own one to open on. Both are this file's, so
 * the field and what fills it cannot drift apart between the places that place it.
 *
 * It is the Site's locale select every other "which language" field already is -- Core's `site-locales`
 * Options Provider over the placement's `availableLocales` -- and no control of its own. It carries no
 * layout either: it stands where the Form's own template puts a field.
 */

/** The value's name, which is the name Core's Site routes take it under and `PhisThreadMessage` reads it back as. */
export const PHI_THREAD_MESSAGE_SOURCE_LANG_FIELD_KEY = "sourceLang";

/**
 * The picker, as a field of a Form that writes a message.
 *
 * Its last choice, after a separator, is "Other language" -- the field's `emptyOption` (FORMS.md, "The
 * empty option"): chosen, the field holds nothing and the Form leaves it out of the request, so Core sees
 * no declaration and stores `source_lang` NULL. It is the writer's way of saying "not one of yours".
 *
 * No `required` rule and no way to clear it, for the reason the profile's language carries none: it
 * opens on a language or on "Other language" and offers no other way to empty it, so the rule would print
 * an asterisk beside a choice that is meant to be left as it is. Core refuses a key it does not know,
 * which is where that answer belongs.
 */
export function phiThreadMessageSourceLangField(
  label: PhiFormTextDescriptor,
  otherLanguageLabel: PhiFormTextDescriptor,
): PhiFormFieldDescriptor {
  return {
    key: PHI_THREAD_MESSAGE_SOURCE_LANG_FIELD_KEY,
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
    label,
    optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteLocales },
    emptyOption: { label: otherLanguageLabel },
  };
}

/**
 * What a writer is assumed to write in: the language they read in.
 *
 * Their own preference where they set one and the Site offers it, otherwise the locale this page is
 * rendered in; where the Site offers neither, nothing -- the picker opens on "Other language", which
 * declares nothing. Most people never touch the picker, so this is what nearly every message declares.
 */
export function resolvePhiThreadMessageSourceLang(
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer">,
): string | undefined {
  const preferred = runtime.viewer.preferredLocale?.trim() ?? "";
  const offered = runtime.site.availableLocales.map((option) => option.code);
  if (preferred && offered.includes(preferred)) return preferred;
  return offered.includes(runtime.locale.current) ? runtime.locale.current : undefined;
}

/**
 * The placement's Form config for a Form that writes a message: the Site's languages for the picker,
 * and the writer's own language among the placement's initial values.
 *
 * Built per request from the page tree, which knows both; the registered Form knows neither
 * (`site-locales-config.ts`). `initialValues` are whatever else the placement starts the Form on -- an
 * internal note offered, say -- and the language is added to them, not put in their place. Where the
 * writer is assumed to write in none of the Site's languages, the language is no initial value at all,
 * and the picker opens on its empty option.
 */
export function buildPhiThreadMessageFormConfig(
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer">,
  initialValues: Record<string, unknown> = {},
): Record<string, unknown> {
  const sourceLang = resolvePhiThreadMessageSourceLang(runtime);
  return {
    [PHI_SITE_LOCALES_CONFIG_KEY]: runtime.site.availableLocales.map(
      (option) => ({ code: option.code, label: option.label }),
    ),
    initialValues: {
      ...initialValues,
      ...(sourceLang ? { [PHI_THREAD_MESSAGE_SOURCE_LANG_FIELD_KEY]: sourceLang } : {}),
    },
  };
}
