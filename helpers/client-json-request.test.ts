import { afterEach, describe, expect, it, vi } from "vitest";

import { readPhiJsonError, readPhiJsonPayload, requestPhiJson } from "./client-json-request";
import { PHI_CSRF_TOKEN_PATH } from "./csrf-token";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("unexpected request");
    return next;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestAt(fetchMock: ReturnType<typeof stubFetch>, index: number) {
  const [path, init] = fetchMock.mock.calls[index] as unknown as [string, RequestInit];
  return { path, init, headers: init.headers as Record<string, string> };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestPhiJson", () => {
  it("reads as the session, uncached, and asks for JSON", async () => {
    const fetchMock = stubFetch(jsonResponse({ state: { a: 1 } }));
    const reply = await requestPhiJson<{ state: unknown }>("/api/site/user-state");
    expect(reply).toEqual({ ok: true, status: 200, payload: { state: { a: 1 } } });
    const { path, init, headers } = requestAt(fetchMock, 0);
    expect(path).toBe("/api/site/user-state");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(init.cache).toBe("no-store");
    expect(headers).toEqual({ accept: "application/json" });
    expect(init.body).toBeUndefined();
  });

  it("serializes a body and says it is JSON", async () => {
    const fetchMock = stubFetch(jsonResponse({ avatar: null }));
    await requestPhiJson("/api/site/account/avatar", { method: "PUT", body: { assetId: 7 } });
    const { init, headers } = requestAt(fetchMock, 0);
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify({ assetId: 7 }));
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["x-csrf-token"]).toBeUndefined();
  });

  it("sends the caller's headers underneath its own", async () => {
    const fetchMock = stubFetch(jsonResponse({ asset: null }));
    await requestPhiJson("/api/site/media/7", {
      body: {},
      headers: { "X-Phis-Area": "admin", Accept: "text/html", "Content-Type": "text/plain" },
    });
    expect(requestAt(fetchMock, 0).headers).toEqual({
      "x-phis-area": "admin",
      accept: "application/json",
      "content-type": "application/json",
    });
  });

  it("fetches a CSRF token first where asked and sends it", async () => {
    const fetchMock = stubFetch(jsonResponse({ token: " t0k " }), jsonResponse({ ok: true }));
    const reply = await requestPhiJson("/api/auth/account/sessions/s1", { method: "DELETE", csrf: true });
    expect(reply.ok).toBe(true);
    expect(requestAt(fetchMock, 0).path).toBe(PHI_CSRF_TOKEN_PATH);
    expect(requestAt(fetchMock, 1).headers["x-csrf-token"]).toBe("t0k");
  });

  it("throws the caller's sentence when no token can be had, and sends nothing", async () => {
    const fetchMock = stubFetch(jsonResponse({}, 500));
    await expect(requestPhiJson("/api/x", {
      method: "POST",
      csrf: true,
      csrfUnavailableMessage: "No secure request.",
    })).rejects.toThrow("No secure request.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("answers a refusal with its status and body instead of throwing", async () => {
    stubFetch(jsonResponse({ error: "Forbidden." }, 403));
    await expect(requestPhiJson("/api/x")).resolves.toEqual({
      ok: false,
      status: 403,
      payload: { error: "Forbidden." },
    });
  });

  it("reads a body that is not JSON as none", async () => {
    stubFetch(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(requestPhiJson("/api/x")).resolves.toEqual({ ok: false, status: 502, payload: null });
  });

  it("passes the abort signal to both requests", async () => {
    const fetchMock = stubFetch(jsonResponse({ token: "t" }), jsonResponse({}));
    const controller = new AbortController();
    await requestPhiJson("/api/x", { method: "POST", csrf: true, signal: controller.signal });
    expect(requestAt(fetchMock, 0).init.signal).toBe(controller.signal);
    expect(requestAt(fetchMock, 1).init.signal).toBe(controller.signal);
  });
});

describe("readPhiJsonPayload", () => {
  it("returns null for an empty body", async () => {
    await expect(readPhiJsonPayload(new Response(null, { status: 204 }))).resolves.toBeNull();
  });
});

describe("readPhiJsonError", () => {
  it("prefers the body's own sentence, trimmed", () => {
    expect(readPhiJsonError({ error: " Nope. " }, "fallback")).toBe("Nope.");
  });

  it("falls back where the body has none, a blank one, or is not an object", () => {
    expect(readPhiJsonError({ error: "  " }, "fallback")).toBe("fallback");
    expect(readPhiJsonError({ error: 42 }, "fallback")).toBe("fallback");
    expect(readPhiJsonError(null, "fallback")).toBe("fallback");
    expect(readPhiJsonError("error", "fallback")).toBe("fallback");
  });

  it("tries the keys in the caller's order", () => {
    const payload = { message: "For a person.", error: "code" };
    expect(readPhiJsonError(payload, "fallback")).toBe("code");
    expect(readPhiJsonError(payload, "fallback", ["message", "error"])).toBe("For a person.");
    expect(readPhiJsonError({ error: "code" }, "fallback", ["message", "error"])).toBe("code");
  });
});
