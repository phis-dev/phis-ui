import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/*
 * The translator, stubbed: it records what each request sent and under which register, and answers
 * every text with a marker naming the register, so a test can see which answer went back where.
 */
const requests: { msgs: string[]; ctx: string | undefined }[] = [];
vi.mock("./tr", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tr")>();
  return {
    ...actual,
    createGlobalTranslator: () => ({
      trBulk: async (msgs: string[], ctx?: string) => {
        requests.push({ msgs, ctx });
        return msgs.map((msg) => `${msg} [${ctx}]`);
      },
    }),
  };
});

const { definePhiCountLabel, definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } = await import("./label-set");
const { PHI_TR_CTX_WEB_UI_LABEL, PHI_TR_CTX_WEB_UI_MESSAGE } = await import("./tr");

const options = (locale: string) => ({ apiBaseUrl: "https://core.test", internalToken: "token", locale });

const set = definePhiLabelSet({
  key: "test:count",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    heading: "Results",
    empty: definePhiMessageLabel("Nothing found."),
    count: definePhiCountLabel({ one: "%1 page", other: "%1 pages" }),
    configured: definePhiCountLabel({ one: "%1 configured", other: "%1 configured" }, PHI_TR_CTX_WEB_UI_MESSAGE),
  },
});

beforeEach(() => {
  requests.length = 0;
});

describe("getPhiLabelSet with count labels", () => {
  it("returns the source categories untranslated in the source locale", async () => {
    const labels = await getPhiLabelSet(options("en"), set);
    expect(labels.count).toEqual({ one: "%1 page", other: "%1 pages" });
    expect(labels.heading).toBe("Results");
    expect(requests).toEqual([]);
  });

  it("translates each category under its register and the category it is", async () => {
    const labels = await getPhiLabelSet(options("pl"), set);
    expect(labels.heading).toBe("Results [Web UI label]");
    expect(labels.empty).toBe("Nothing found. [Web UI message]");
    expect(labels.count).toEqual({
      one: "%1 page [Web UI label, plural category one]",
      other: "%1 pages [Web UI label, plural category other]",
    });
    expect(labels.configured).toEqual({
      one: "%1 configured [Web UI message, plural category one]",
      other: "%1 configured [Web UI message, plural category other]",
    });
    // English writing two forms alike does not make them one message: each category has its own identity.
    const contexts = requests.map((request) => request.ctx).sort();
    expect(contexts).toEqual([
      "Web UI label",
      "Web UI label, plural category one",
      "Web UI label, plural category other",
      "Web UI message",
      "Web UI message, plural category one",
      "Web UI message, plural category other",
    ]);
  });
});
