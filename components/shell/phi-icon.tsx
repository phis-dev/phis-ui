"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type ComponentType,
} from "react";

import { PHI_ANTD_ICON_NAMES, PhiAntdIcon, type PhiAntdIconPresentation } from "./phi-antd-icon";

type PhiIconifyProps = {
  icon: string;
  width?: number | string;
  height?: number | string;
  inline?: boolean;
};

/**
 * `style`, `className`, `title`, `ariaLabel` and `twoToneColor` reach the Ant Design icons, which is
 * where the house draws its interface icons; a motif, Iconify or asset icon takes its size only.
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

function renderAntdIcon(key: string, size: number | string, presentation: PhiAntdIconPresentation) {
  const icon = PHI_ANTD_ICON_NAMES[key];
  return icon ? <PhiAntdIcon icon={icon} size={size} {...presentation} /> : null;
}

function renderBuilderIcon(
  namespace: string,
  motif: string,
  size: number | string,
) {
  const isLayoutNamespace = namespace.endsWith("/layouts");
  const isWidgetNamespace = namespace.endsWith("/widgets");

  if (!isLayoutNamespace && !isWidgetNamespace) {
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
