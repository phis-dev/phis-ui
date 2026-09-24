import { beforeEach, describe, expect, it } from "vitest";

import { peekPhiAreaRootDoor, rememberPhiAreaRootDoor } from "./area-root-door";
import { clearPhiSiteReadCache } from "./site-read-cache";

describe("the Area root door", () => {
  beforeEach(() => {
    clearPhiSiteReadCache();
  });

  it("knows nothing until a render has told it", async () => {
    await expect(peekPhiAreaRootDoor("editor")).resolves.toBeNull();
  });

  it("remembers what the Area root forwarded to", async () => {
    rememberPhiAreaRootDoor("editor", "/editor", "/editor/phis/ui/dashboard");
    await expect(peekPhiAreaRootDoor("editor")).resolves.toBe("/editor/phis/ui/dashboard");
  });

  /*
   * The Layout that forwards runs for every request in its Area, not only for the root, so the guard is
   * what keeps a forward resolved for some other Page out of the door. Without it, a Page that forwards
   * anywhere would teach the proxy that the Area's front door leads there.
   */
  it("ignores a forward resolved for anything but the root", async () => {
    rememberPhiAreaRootDoor("editor", "/editor/phis/ui/translations", "/editor/phis/ui/dashboard");
    await expect(peekPhiAreaRootDoor("editor")).resolves.toBeNull();
  });

  it("reads the root with a trailing slash and any casing as the root", async () => {
    rememberPhiAreaRootDoor("Editor", "/Editor/", "/editor/phis/ui/dashboard");
    await expect(peekPhiAreaRootDoor("editor")).resolves.toBe("/editor/phis/ui/dashboard");
  });

  /* A door onto the address the request already names is the loop the forward guard exists to prevent. */
  it("refuses a door onto the root itself", async () => {
    rememberPhiAreaRootDoor("editor", "/editor", "/editor");
    await expect(peekPhiAreaRootDoor("editor")).resolves.toBeNull();
  });

  it("refuses anything that is not a Site-relative path", async () => {
    rememberPhiAreaRootDoor("editor", "/editor", "https://example.test/editor");
    await expect(peekPhiAreaRootDoor("editor")).resolves.toBeNull();
  });

  it("keeps one door per Area", async () => {
    rememberPhiAreaRootDoor("editor", "/editor", "/editor/phis/ui/dashboard");
    rememberPhiAreaRootDoor("admin", "/admin", "/admin/phis/ui/users");
    await expect(peekPhiAreaRootDoor("editor")).resolves.toBe("/editor/phis/ui/dashboard");
    await expect(peekPhiAreaRootDoor("admin")).resolves.toBe("/admin/phis/ui/users");
  });

  /*
   * The read marker is the real invalidation: a publish moves it and the Site config refresh sweeps
   * everything else out of this cache. The door must go with that sweep rather than outlive it.
   */
  it("is swept with the rest when a publish moves the read marker", async () => {
    rememberPhiAreaRootDoor("editor", "/editor", "/editor/phis/ui/dashboard");
    clearPhiSiteReadCache();
    await expect(peekPhiAreaRootDoor("editor")).resolves.toBeNull();
  });
});
