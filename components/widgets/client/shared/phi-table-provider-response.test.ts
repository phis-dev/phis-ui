import { describe, expect, it } from "vitest";

import { PhiTableProviderError } from "../../../../types/table-widget";
import { readPhiTableProviderResponse } from "./phi-table-provider-response";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("readPhiTableProviderResponse", () => {
  it("returns the parsed body of an accepted answer", async () => {
    await expect(readPhiTableProviderResponse<{ rows: number[] }>(
      jsonResponse({ rows: [1] }),
      { subject: "Groups" },
    )).resolves.toEqual({ rows: [1] });
  });

  it("returns null for an accepted answer without a JSON body", async () => {
    await expect(readPhiTableProviderResponse(new Response(null, { status: 204 }), { subject: "Groups" }))
      .resolves.toBeNull();
  });

  it("refuses with the body's error as request-failed", async () => {
    const failure = readPhiTableProviderResponse(jsonResponse({ error: "No access." }, 403), {
      subject: "Localization",
    });
    await expect(failure).rejects.toBeInstanceOf(PhiTableProviderError);
    await expect(failure).rejects.toMatchObject({ code: "request-failed", message: "No access." });
  });

  it("names the subject and status where the body says nothing", async () => {
    await expect(readPhiTableProviderResponse(new Response("oops", { status: 500 }), {
      subject: "User Management",
    })).rejects.toMatchObject({ message: "User Management request failed with status 500." });
  });

  it("reads `message` before `error` only where the caller asks", async () => {
    const body = { message: "Group is retired.", error: "retired" };
    await expect(readPhiTableProviderResponse(jsonResponse(body, 409), { subject: "Groups" }))
      .rejects.toMatchObject({ message: "retired" });
    await expect(readPhiTableProviderResponse(jsonResponse(body, 409), {
      subject: "Groups",
      errorKeys: ["message", "error"],
    })).rejects.toMatchObject({ message: "Group is retired." });
  });
});
