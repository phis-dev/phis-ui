import { describe, expect, it } from "vitest";

import {
  readPhiFormHandlerPathError,
  readPhiFormHandlerPathKeys,
  shapePhiFormHandlerRequest,
} from "./form-handler-request";

/** The relay fills a Core route's address from a Form's values (FORMS.md, "Request shape"). */
describe("a handler's request", () => {
  it("is the values as they are where the path names none", () => {
    expect(shapePhiFormHandlerRequest({ upstreamPath: "/api/v1/auth/profile/phone", values: { phone: "1", mobile: "" } }))
      .toEqual({ path: "/api/v1/auth/profile/phone", body: { phone: "1", mobile: "" } });
  });

  it("fills the path from a value, which leaves the body, and keeps every other value as the Form holds it", () => {
    expect(shapePhiFormHandlerRequest({
      upstreamPath: "/api/site/account/addresses/{id}",
      values: { id: 42, address: { name: "Ada" }, flags: 5 },
    })).toEqual({ path: "/api/site/account/addresses/42", body: { address: { name: "Ada" }, flags: 5 } });
  });

  it("percent-encodes a path value and refuses an empty one", () => {
    expect(shapePhiFormHandlerRequest({ upstreamPath: "/x/{key}", values: { key: "@a/b" } }))
      .toEqual({ path: "/x/%40a%2Fb", body: {} });
    expect(shapePhiFormHandlerRequest({ upstreamPath: "/x/{key}", values: { key: " " } }))
      .toEqual({ error: expect.stringContaining('"key"') });
  });

  it("is refused by the catalog where the path names a field twice", () => {
    expect(readPhiFormHandlerPathKeys("/a/{id}/b/{other}")).toEqual(["id", "other"]);
    expect(readPhiFormHandlerPathError("/a/{id}/b/{other}")).toBeNull();
    expect(readPhiFormHandlerPathError("/a/{id}/b/{id}")).toContain('"id"');
    expect(readPhiFormHandlerPathError(null)).toBeNull();
  });
});
