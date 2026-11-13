"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  indexPhiModuleIconSets,
  resolvePhiModuleIcon,
  type PhiModuleIconIndex,
} from "../../helpers/module-icons";
import type { PhiModuleIconSet } from "../../types/module-icons";
import { PhiAntdIcon, type PhiAntdIconPresentation } from "./phi-antd-icon";

/*
 * The icons of the Modules active where an icon is drawn.
 *
 * The Area's root Layout provides the active Modules' icons of the Area (`components/cms/
 * phi-cms-root-layout.tsx`); the Builder replaces them with the target Area's around its canvas and its
 * Inspector, where an icon that is not there is flagged rather than left blank -- an author can do
 * something about it, a visitor cannot.
 */

type PhiModuleIconsState = {
  sets: readonly PhiModuleIconSet[];
  index: PhiModuleIconIndex;
  flagUnavailable: boolean;
};

const EMPTY_MODULE_ICONS: PhiModuleIconsState = {
  sets: [],
  index: new Map(),
  flagUnavailable: false,
};

const PhiModuleIconsContext = createContext<PhiModuleIconsState>(EMPTY_MODULE_ICONS);

/**
 * The icons `PhiIcon` resolves a `module:` name against below this point. A nested provider replaces the
 * outer one rather than adding to it: the Builder's canvas holds the target Area's Modules, not its own.
 */
export function PhiModuleIconsProvider({
  sets,
  flagUnavailable = false,
  children,
}: {
  sets: readonly PhiModuleIconSet[];
  /** Draw a marked placeholder for a `module:` name that does not resolve, instead of nothing. */
  flagUnavailable?: boolean;
  children: ReactNode;
}) {
  const state = useMemo<PhiModuleIconsState>(
    () => ({ sets, index: indexPhiModuleIconSets(sets), flagUnavailable }),
    [flagUnavailable, sets],
  );
  return <PhiModuleIconsContext.Provider value={state}>{children}</PhiModuleIconsContext.Provider>;
}

/** The active Modules' icon sets, for a picker that offers them. */
export function usePhiModuleIconSets(): readonly PhiModuleIconSet[] {
  return useContext(PhiModuleIconsContext).sets;
}

export function PhiModuleIcon({
  name,
  size,
  style,
  className,
  title,
  ariaLabel,
}: {
  name: string;
  size: number | string;
} & PhiAntdIconPresentation) {
  const { index, flagUnavailable } = useContext(PhiModuleIconsContext);
  const icon = resolvePhiModuleIcon(index, name);
  if (!icon) {
    /*
     * In the Builder the name stays visible as the mark's title: the Module is not active in the target
     * Area, or does not register that name. Live, a missing icon is nothing, as an unknown `antd:` is.
     */
    return flagUnavailable ? (
      <PhiAntdIcon
        icon="WarningOutlined"
        size={size}
        title={name}
        className={className ? `phi-module-icon-unavailable ${className}` : "phi-module-icon-unavailable"}
        style={{ color: "var(--ant-color-warning)", ...style }}
      />
    ) : null;
  }
  const { drawing } = icon;
  return (
    // `anticon` gives it the box, alignment and Button spacing every other icon of the house has.
    <span
      role="img"
      aria-label={ariaLabel ?? icon.name}
      title={title}
      className={className ? `anticon ${className}` : "anticon"}
      style={size === "1em" ? style : { fontSize: size, ...style }}
    >
      <svg
        viewBox={drawing.viewBox}
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        {drawing.paths.map((path, index) => (
          <path key={index} d={path} fillRule={drawing.fillRule} />
        ))}
      </svg>
    </span>
  );
}
