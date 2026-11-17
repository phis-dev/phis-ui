import "server-only";

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The identity of the Site's build: the token Next writes to `BUILD_ID` in its output directory on every
 * `next build`. It is the one thing that says "different code is running" without anyone keeping a number
 * (SEARCH.md, "When the index is written").
 *
 * Next has no public runtime API for it, and phis-ui names no output directory anywhere else, so this
 * assumes the default: `.next` under the working directory, which for a Site's service is the directory of
 * its release. A Site that sets `distDir` gets the fallback below, which re-indexes on every start --
 * correct, only more often than needed. It deliberately does not read the Core's `release.json`: that file
 * exists only for Sites the phis CLI built.
 *
 * Read once per process. Without the file (`next dev`, tests) the id is made once per process, so a
 * development start indexes anew and nothing fails. A read failure other than "no such file" is logged
 * once and treated the same way.
 */
export type PhiSiteBuildIdOptions = {
  /** The Next output directory; defaults to `.next` under the working directory. */
  directory?: string;
  /** Reads the file's text; defaults to `node:fs`. Throws as `readFileSync` does. */
  readFile?: (filePath: string) => string;
};

export function readPhiSiteBuildId(options: PhiSiteBuildIdOptions = {}): string {
  const directory = options.directory ?? path.join(process.cwd(), ".next");
  const readFile = options.readFile ?? ((filePath: string) => readFileSync(filePath, "utf8"));
  const filePath = path.join(directory, "BUILD_ID");
  try {
    const id = readFile(filePath).trim();
    if (id) return id;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      console.error(`[phis-ui] The Site's build id could not be read from ${filePath}.`, error);
    }
  }
  return `process-${randomUUID()}`;
}

const BUILD_ID_KEY = Symbol.for("phis-ui.site-build-id");

/** The build id of this process, read on first use and kept (also across duplicate module instances). */
export function getPhiSiteBuildId(): string {
  const holder = globalThis as typeof globalThis & { [BUILD_ID_KEY]?: string };
  holder[BUILD_ID_KEY] ??= readPhiSiteBuildId();
  return holder[BUILD_ID_KEY];
}
