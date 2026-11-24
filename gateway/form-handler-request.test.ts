import { describe, expect, it } from "vitest";

import {
  readPhiFormHandlerPathKeys,
  readPhiFormHandlerRequestShapeError,
  shapePhiFormHandlerRequest,
} from "./form-handler-request";

const ADDRESS_REQUEST = {
  objects: { address: ["name", "line1", "city", "country"] },
  flags: { flags: { billing: 1, shipping: 2, defaultBilling: 4 } },
};

/** The relay forms a Core route's request from a Form's flat values (FORMS.md, "Request shape"). */
describe("a handler's request shape", () => {
  it("leaves the values as the body where the handler states none", () => {
    expect(shapePhiFormHandlerRequest({ upstreamPath: "/api/v1/auth/profile/phone", request: undefined, values: { phone: "1", mobile: "" } }))
      .toEqual({ path: "/api/v1/auth/profile/phone", body: { phone: "1", mobile: "" } });
  });

  it("fills the path from a value, gathers the parts under one key and folds the marks into flags", () => {
    expect(shapePhiFormHandlerRequest({
      upstreamPath: "/api/site/account/addresses/{id}",
      request: ADDRESS_REQUEST,
      values: { id: 42, name: "Ada", line1: "Main 1", city: "Bern", country: "CH", billing: true, shipping: false, defaultBilling: true, extra: "kept" },
    })).toEqual({
      path: "/api/site/account/addresses/42",
      body: { extra: "kept", address: { name: "Ada", line1: "Main 1", city: "Bern", country: "CH" }, flags: 5 },
    });
  });

  it("percent-encodes a path value and refuses an empty one", () => {
    expect(shapePhiFormHandlerRequest({ upstreamPath: "/x/{key}", request: undefined, values: { key: "@a/b" } }))
      .toEqual({ path: "/x/%40a%2Fb", body: {} });
    expect(shapePhiFormHandlerRequest({ upstreamPath: "/x/{key}", request: undefined, values: { key: " " } }))
      .toEqual({ error: expect.stringContaining('"key"') });
  });

  it("is refused by the catalog where a field is named twice or a bit is no power of two", () => {
    expect(readPhiFormHandlerPathKeys("/a/{id}/b/{other}")).toEqual(["id", "other"]);
    expect(readPhiFormHandlerRequestShapeError("/a/{id}", ADDRESS_REQUEST)).toBeNull();
    expect(readPhiFormHandlerRequestShapeError("/a/{name}", ADDRESS_REQUEST)).toContain('"name"');
    expect(readPhiFormHandlerRequestShapeError("/a", { flags: { flags: { billing: 3 } } })).toContain("power of two");
    expect(readPhiFormHandlerRequestShapeError("/a", { objects: { flags: ["a"] }, flags: { flags: { b: 1 } } })).toContain("both");
  });
});
