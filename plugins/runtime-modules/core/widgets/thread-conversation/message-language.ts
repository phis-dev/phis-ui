import type { PhisThreadMessage } from "../../../../../types/threads";
import { PhisThreadMessageFlag } from "../../../../../constants/threads";

/**
 * Whether text written in one locale reads as written for another.
 *
 * The language and the script decide, and the region does not: `pt-BR` and `pt`, or `en-US` and `en-GB`,
 * are one language to a reader, while `zh-Hans` and `zh-Hant` are one language in two scripts. That is
 * the distinction Core's capability table draws -- it carries a script for exactly those -- and Core asks
 * the same question before it calls a provider (`isPhiSameWrittenLanguage`, phis-server `lib/locale.ts`),
 * so the link is absent where the route would answer with the original anyway.
 *
 * `Intl.Locale#maximize` supplies the script a key leaves implicit: `zh` and `zh-CN` are Hans, `zh-TW`
 * is Hant, `de` is Latn. False wherever either side is missing or no locale at all -- an unknown language
 * is never "the same".
 */
export function isPhiSameWrittenLanguage(left: string | null | undefined, right: string | null | undefined) {
  const a = readWrittenLanguage(left);
  const b = readWrittenLanguage(right);
  return a != null && b != null && a.language === b.language && a.script === b.script;
}

function readWrittenLanguage(value: string | null | undefined) {
  const raw = value?.trim().replace(/_/g, "-") ?? "";
  if (!raw) {
    return null;
  }
  try {
    const locale = new Intl.Locale(raw).maximize();
    return { language: locale.language, script: locale.script ?? null };
  } catch {
    return null;
  }
}

/**
 * Whether a message offers to be read in the reader's language.
 *
 * Only where there is a language to translate into (`target`, null where this installation cannot
 * produce the reader's), a body to translate, no `Confidential` flag -- the one flag about where a body
 * may go, and a translation is the body leaving Core -- and a source language that is not already the
 * reader's. That last one is what the writer's declaration is for (THREADS.md section 9): a German
 * message read in German offered "Translate" on every row before, and pressed, paid for German into
 * German. A message whose language nobody knows still offers it; the provider finds out.
 */
export function offersPhiMessageTranslation(
  message: Pick<PhisThreadMessage, "flags" | "bodyText" | "sourceLang">,
  target: string | null,
) {
  if (target == null || message.bodyText == null) {
    return false;
  }
  if ((message.flags & PhisThreadMessageFlag.Confidential) !== 0) {
    return false;
  }
  return !isPhiSameWrittenLanguage(message.sourceLang, target);
}
