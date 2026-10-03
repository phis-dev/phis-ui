import type { CSSProperties, ReactNode } from "react";

import type { PhiCmsRegionConfig, PhiCmsRegionKey } from "../../types";
import { resolvePhiCmsRegionShell, type PhiCmsRegionShellTheme } from "./phi-cms-region-shell";
import { PhiSurfaceGroundLayer } from "../surface/phi-surface-ground";

export type PhiCmsRegionStaticProps = {
  children: ReactNode;
  className?: string;
  regionKey: PhiCmsRegionKey;
  config?: PhiCmsRegionConfig;
  shellTheme?: PhiCmsRegionShellTheme;
  style?: CSSProperties;
  regionType?: number;
  previewMode?: boolean;
};

/**
 * A Region with nothing to do after it has rendered. Everything it draws comes from the Region-shell
 * resolver it shares with the client renderer; it does not know the colour mode, so it publishes both
 * and lets `shell.css` switch them.
 */
export function PhiCmsRegionStatic({
  children,
  className,
  regionKey,
  config = {},
  shellTheme,
  style,
  regionType,
  previewMode = false,
}: PhiCmsRegionStaticProps) {
  const shell = resolvePhiCmsRegionShell({
    regionKey,
    config,
    shellTheme,
    paint: { kind: "published" },
    previewMode,
    regionType,
    className,
    style,
  });
  if (shell == null) {
    return null;
  }

  const Element = shell.element;
  return (
    <Element {...shell.attributes} style={shell.style}>
      <PhiSurfaceGroundLayer ground={shell.ground} />
      <div className="phi-cms-region-shell__content" style={shell.contentStyle}>
        {children}
      </div>
    </Element>
  );
}
