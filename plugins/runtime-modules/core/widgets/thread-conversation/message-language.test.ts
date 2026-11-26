import { describe, expect, it } from "vitest";

import { PhisThreadMessageFlag } from "../../../../../constants/threads";
import { isPhiSameWrittenLanguage, offersPhiMessageTranslation } from "./message-language";

const message = (sourceLang: string | null, flags = 0) => ({ flags, bodyText: "Hallo, wie geht es?", sourceLang });

/*
 * "Translate" stands on a message only where there is something to translate it out of: a German message
 * read in German carried it before the writer declared a language, and pressed, paid for German into German.
 */
describe("the translate link on one message", () => {
  it("is absent where the message is written in the reader's language", () => {
    expect(offersPhiMessageTranslation(message("de"), "de")).toBe(false);
    expect(offersPhiMessageTranslation(message("de-AT"), "de")).toBe(false);
    expect(offersPhiMessageTranslation(message("pt"), "pt-BR")).toBe(false);
    expect(offersPhiMessageTranslation(message("en-US"), "en")).toBe(false);
  });

  it("stands where the message is in another language, another script included", () => {
    expect(offersPhiMessageTranslation(message("en"), "de")).toBe(true);
    expect(offersPhiMessageTranslation(message("zh-Hant"), "zh-Hans")).toBe(true);
  });

  it("stands where nobody knows the message's language", () => {
    expect(offersPhiMessageTranslation(message(null), "de")).toBe(true);
  });

  it("is absent without a target, without a body, and on a Confidential message", () => {
    expect(offersPhiMessageTranslation(message("en"), null)).toBe(false);
    expect(offersPhiMessageTranslation({ ...message("en"), bodyText: null }, "de")).toBe(false);
    expect(offersPhiMessageTranslation(message("en", PhisThreadMessageFlag.Confidential), "de")).toBe(false);
  });
});

describe("the same written language", () => {
  it("is the language and the script, never the region", () => {
    for (const [left, right] of [["de", "de-DE"], ["de_CH", "de-AT"], ["en-GB", "en-US"], ["pt", "pt-BR"], ["zh", "zh-Hans"], ["zh-CN", "zh-Hans"], ["zh-TW", "zh-Hant"]]) {
      expect(isPhiSameWrittenLanguage(left, right)).toBe(true);
    }
    for (const [left, right] of [["de", "en"], ["zh-Hans", "zh-Hant"], ["zh-CN", "zh-TW"]]) {
      expect(isPhiSameWrittenLanguage(left, right)).toBe(false);
    }
  });

  it("is never claimed for a missing or broken side", () => {
    for (const [left, right] of [[null, "de"], ["de", undefined], ["", ""], ["not a locale!", "not a locale!"]]) {
      expect(isPhiSameWrittenLanguage(left, right)).toBe(false);
    }
  });
});
