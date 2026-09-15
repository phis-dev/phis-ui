import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { clearPhiTranslationCache } from "../helpers/translation-cache";
import { tr, trBulk } from "./tr";

const options = { apiBaseUrl: "http://phis.test", internalToken: "token", locale: "de", siteKey: "acme" };

function answer(body: Record<string, unknown>) {
  return vi.fn(async (_url: string | URL, _init?: RequestInit) => Response.json(body));
}

describe("tr and trBulk", () => {
  afterEach(() => {
    clearPhiTranslationCache();
    vi.unstubAllGlobals();
  });

  it("keeps a translation and does not ask again", async () => {
    const fetchMock = answer({ translation: "Startseite" });
    vi.stubGlobal("fetch", fetchMock);

    expect(await tr(options, "Home")).toBe("Startseite");
    expect(await tr(options, "Home")).toBe("Startseite");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.cache).toBe("no-store");
  });

  // Core hands back source text when a provider fails; kept without expiry, it would outlive the outage.
  it("hands on a provisional answer without keeping it", async () => {
    const fetchMock = answer({ translation: "Home", provisional: true });
    vi.stubGlobal("fetch", fetchMock);

    expect(await tr(options, "Home")).toBe("Home");
    await tr(options, "Home");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not keep a provisional batch", async () => {
    const fetchMock = answer({ translations: ["Home", "Weg"], provisional: true });
    vi.stubGlobal("fetch", fetchMock);

    expect(await trBulk(options, ["Home", "Away"])).toEqual(["Home", "Weg"]);
    await trBulk(options, ["Home", "Away"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not keep an answer read before the cache was cleared", async () => {
    let release: () => void = () => {};
    const fetchMock = vi.fn(async (_url: string | URL, _init?: RequestInit) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return Response.json({ translation: "Alt" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = tr(options, "Home");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    clearPhiTranslationCache({ scope: "acme" });
    release();
    expect(await pending).toBe("Alt");

    vi.stubGlobal("fetch", answer({ translation: "Neu" }));
    expect(await tr(options, "Home")).toBe("Neu");
  });
});
