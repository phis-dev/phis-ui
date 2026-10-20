import type { NextConfig } from "next";

/** The specifier the root layout imports Ant Design's structure by. */
export declare const PHI_ANTD_STATIC_CSS: "@phis/ui/antd-static.css";

/** The root font size the structure's px are converted against; `PHI_REM_ROOT_PX` in `theme/phi-css-vars.ts`. */
export declare const PHI_ANTD_STATIC_REM_ROOT_PX: number;

/** The structural CSS of every Ant Design component, from the Ant Design installed for `projectDir`. */
export declare function generatePhiAntdStaticCss(projectDir?: string): {
  versions: { antd: string; cssinjs: string; icons: string };
  css: string;
};

/** The generated file for the Ant Design installed for `projectDir`, written once per input. */
export declare function ensurePhiAntdStaticCss(projectDir?: string): string;

/**
 * A Site's `next.config`, with `@phis/ui/antd-static.css` resolved to the structure generated for its
 * Ant Design. `dir` is the Site's root, the directory its `package.json` is in.
 */
export declare function withPhiNextConfig<T extends NextConfig>(
  nextConfig: T,
  options?: { dir?: string },
): T & { turbopack: NonNullable<T["turbopack"]> & { resolveAlias: Record<string, unknown> } };
