"use client";

import { useState, type ReactNode } from "react";
import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";
import { useServerInsertedHTML } from "next/navigation";

/** The rule `extractStyle` closes every extract with; with nothing before it, the extract is empty. */
const PHI_ANTD_CACHE_PATH_RULE = /\.data-ant-cssinjs-cache-path\{content:"[^"]*";\}$/;

/**
 * Collects what Ant Design registers while the server renders and writes it into the streamed HTML.
 *
 * `AntdRegistry` from `@ant-design/nextjs-registry` (1.3.0) did this and dropped every flush after the
 * first. It took an extract whose cache-path rule reads `content:""` for an empty one, but that rule
 * only lists structure styles, and the root runs with `zeroRuntime` (`phi-root-theme-resolver.ts`): after
 * the first flush there are none, only the CSS variables of the components that streamed in since. A
 * Sider streams in late, so its Menu reached the browser without its item height variable, its items
 * stood at line height 0 with only their icons showing, and jumped open once the client had rendered.
 * Here an extract counts as empty when nothing stands before that closing rule.
 */
export function PhiAntdRegistry({ children }: { children: ReactNode }) {
  const [cache] = useState(() => createCache());

  useServerInsertedHTML(() => {
    const styleText = extractStyle(cache, { plain: true, once: true });
    if (styleText.replace(PHI_ANTD_CACHE_PATH_RULE, "").length === 0) {
      return null;
    }
    return (
      <style
        id="antd-cssinjs"
        // Before the styles the client registers later, as the registry this replaces put them.
        data-rc-order="prepend"
        data-rc-priority="-1000"
        dangerouslySetInnerHTML={{ __html: styleText }}
      />
    );
  });

  return <StyleProvider cache={cache}>{children}</StyleProvider>;
}
