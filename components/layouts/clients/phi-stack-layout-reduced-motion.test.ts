import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The reduced-motion branch of the Stack's fade-over, read from its source.
 *
 * Mounting the Stack takes the config provider, the slot-sequence signals and a slot switch driven
 * from outside, which is a harness far larger than the line it would guard. What is pinned is that the
 * branch styles nothing: an inline `opacity: 0` it once set outlived the transition, and a slot kept
 * mounted (`lazy-keep`, `eager`) came back as an empty tab.
 */
describe("the Stack's fade-over under reduced motion", () => {
  it("clears the outgoing slot without leaving a style on the element", async () => {
    const source = await readFile(
      path.join(__dirname, "phi-stack-layout-client.tsx"),
      "utf8",
    );
    const branch = /if \(reducedMotion \|\| duration <= 0[\s\S]*?return undefined;\n    \}/u.exec(source);

    expect(branch, "the reduced-motion branch").not.toBeNull();
    expect(branch![0]).toContain("queueMicrotask(clearOutgoingSlot)");
    expect(branch![0]).not.toMatch(/\.style\./u);
  });
});
