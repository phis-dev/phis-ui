"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type ComponentType,
} from "react";

import { PHI_MODULE_ICON_NAMESPACE } from "../../constants/module-identity";
import { PhiAntdIcon, type PhiAntdIconPresentation } from "./phi-antd-icon";
import { isPhiBuilderIconNamespace, isPhiIconNameKnown, PHI_ANTD_ICON_NAMES } from "./phi-icon-names";

export { isPhiIconNameKnown };
import { PhiModuleIcon } from "./phi-module-icons";

type PhiIconifyProps = {
  icon: string;
  width?: number | string;
  height?: number | string;
  inline?: boolean;
};

/**
 * `style`, `className`, `title`, `ariaLabel` and `twoToneColor` reach the Ant Design icons, which is
 * where the house draws its interface icons, and all but `twoToneColor` a Module's own icon
 * (`module:<runtime module id>/<name>`); a motif, Iconify or asset icon takes its size only.
 */
type PhiIconProps = {
  name?: string;
  size?: number | string;
} & PhiAntdIconPresentation;

let iconifyComponentLoader: Promise<ComponentType<PhiIconifyProps>> | null = null;

function loadIconifyComponent() {
  if (!iconifyComponentLoader) {
    iconifyComponentLoader = import("@iconify/react").then((module) => module.Icon as ComponentType<PhiIconifyProps>);
  }

  return iconifyComponentLoader;
}


const LazyPhiBuilderMotifIcon = lazy(
  () => import("./phi-builder-motif-icon").then((module) => ({
    default: module.PhiBuilderMotifIcon,
  })),
);
/*
 * `next/image` for the one namespace that needs it, which a page of Ant Design and Iconify icons never
 * names -- it was on every first load that drew any icon at all.
 */
const LazyPhiAssetIcon = lazy(
  () => import("./phi-asset-icon").then((module) => ({
    default: module.PhiAssetIcon,
  })),
);

function renderIconFallback(size: number | string) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        width: size,
        height: size,
      }}
    />
  );
}



const reportedUnknownIconNames = new Set<string>();

/**
 * Says once per name that it names no icon, where somebody reads it.
 *
 * An unknown name draws nothing -- no word, no placeholder -- so without this a typo is a blank nobody
 * notices. Rendered on the server the warning lands in the Site service's journal, in the browser in its
 * console. `validate-preset-icon-vocabulary` catches the same mistake in a preset before it ships.
 */
export function reportPhiUnknownIconName(name: string) {
  if (reportedUnknownIconNames.has(name)) return;
  reportedUnknownIconNames.add(name);
  console.warn(
    `[phi-icon] "${name}" names no icon and draws nothing. Use a name from PHI_ANTD_ICON_NAMES `
      + "(components/shell/phi-icon-names.ts), with or without `antd:`, or a `module:`, `iconify:` or `asset:` name.",
  );
}

function renderAntdIcon(key: string, size: number | string, presentation: PhiAntdIconPresentation) {
  const icon = PHI_ANTD_ICON_NAMES[key];
  return icon ? <PhiAntdIcon icon={icon} size={size} {...presentation} /> : null;
}

function renderBuilderIcon(
  namespace: string,
  motif: string,
  size: number | string,
) {
  if (!isPhiBuilderIconNamespace(namespace)) {
    return null;
  }

  return (
    <Suspense fallback={renderIconFallback(size)}>
      <LazyPhiBuilderMotifIcon
        namespace={namespace}
        motif={motif}
        size={size}
      />
    </Suspense>
  );
}

function PhiIconifyIcon({ icon, size }: { icon: string; size: number | string }) {
  const [IconifyIcon, setIconifyIcon] = useState<ComponentType<PhiIconifyProps> | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadIconifyComponent()
      .then((component) => {
        if (!cancelled) {
          setIconifyIcon(() => component);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIconifyIcon(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!IconifyIcon) {
    return (
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    );
  }

  return <IconifyIcon icon={icon} width={size} height={size} inline />;
}

export function PhiIcon({ name, size = 16, ...presentation }: PhiIconProps) {
  if (!name) {
    return null;
  }
  if (!isPhiIconNameKnown(name)) {
    reportPhiUnknownIconName(name);
    return null;
  }
  const resolvedSize = size === "inherit" ? "1em" : size;

  const [namespace, ...rest] = name.split(":");
  const value = rest.join(":");

  if (!value) {
    return renderAntdIcon(name, resolvedSize, presentation);
  }

  const builderIcon = renderBuilderIcon(namespace, value, resolvedSize);
  if (builderIcon) {
    return builderIcon;
  }

  switch (namespace) {
    case PHI_MODULE_ICON_NAMESPACE:
      return <PhiModuleIcon name={name} size={resolvedSize} {...presentation} />;
    case "antd":
      return renderAntdIcon(value, resolvedSize, presentation);
    case "iconify":
      return value ? <PhiIconifyIcon icon={value} size={resolvedSize} /> : null;
    case "asset":
      return (
        <Suspense fallback={renderIconFallback(resolvedSize)}>
          <LazyPhiAssetIcon path={value} size={resolvedSize} />
        </Suspense>
      );
    default:
      return null;
  }
}
