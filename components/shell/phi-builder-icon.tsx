"use client";

import type { CSSProperties, ReactNode } from "react";

type PhiBuilderIconMotif =
  | "content"
  | "vertical"
  | "flex"
  | "stack"
  | "grid"
  | "masonry"
  | "split-card"
  | "three-column"
  | "threecol"
  | "structure-region";

type PhiBuilderIconProps = {
  motif: PhiBuilderIconMotif;
  size?: number | string;
};

const ICON_BOX: CSSProperties = {
  display: "inline-flex",
  color: "currentColor",
};

function Frame({
  size,
  children,
}: {
  size: number | string;
  children: ReactNode;
}) {
  const radius = 0;

  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ ...ICON_BOX, width: size, height: size }}
    >
      <rect x="1" y="1" width="14" height="14" rx={radius} stroke="currentColor" strokeWidth="1" />
      {children}
    </svg>
  );
}

function ContentMotif() {
  return (
    <rect x="3.5" y="3.5" width="9" height="9" rx="1.2" fill="currentColor" fillOpacity="0.18" />
  );
}

function FlexMotif() {
  return (
    <>
      <rect x="3" y="4" width="3" height="8" rx="0.8" fill="currentColor" fillOpacity="0.16" />
      <rect x="6.5" y="3" width="3" height="10" rx="0.8" fill="currentColor" fillOpacity="0.28" />
      <rect x="10" y="5" width="3" height="6" rx="0.8" fill="currentColor" fillOpacity="0.16" />
    </>
  );
}

function VerticalMotif() {
  return (
    <>
      <rect x="4" y="3" width="8" height="2" rx="0.8" fill="currentColor" fillOpacity="0.18" />
      <rect x="4" y="6.5" width="8" height="2" rx="0.8" fill="currentColor" fillOpacity="0.3" />
      <rect x="4" y="10" width="8" height="2" rx="0.8" fill="currentColor" fillOpacity="0.18" />
    </>
  );
}

function StackMotif() {
  return (
    <>
      <rect x="3" y="4" width="10" height="3" rx="1" fill="currentColor" fillOpacity="0.14" />
      <rect x="4" y="7" width="8" height="3" rx="1" fill="currentColor" fillOpacity="0.24" />
      <rect x="5" y="10" width="6" height="3" rx="1" fill="currentColor" fillOpacity="0.14" />
    </>
  );
}

function GridMotif() {
  return (
    <>
      <rect x="3" y="3" width="4" height="4" rx="0.8" fill="currentColor" fillOpacity="0.18" />
      <rect x="9" y="3" width="4" height="4" rx="0.8" fill="currentColor" fillOpacity="0.18" />
      <rect x="3" y="9" width="4" height="4" rx="0.8" fill="currentColor" fillOpacity="0.18" />
      <rect x="9" y="9" width="4" height="4" rx="0.8" fill="currentColor" fillOpacity="0.34" />
    </>
  );
}

function MasonryMotif() {
  return (
    <>
      <rect x="3" y="3" width="3" height="10" rx="0.8" fill="currentColor" fillOpacity="0.18" />
      <rect x="6.5" y="3" width="3" height="6" rx="0.8" fill="currentColor" fillOpacity="0.32" />
      <rect x="10" y="3" width="3" height="8" rx="0.8" fill="currentColor" fillOpacity="0.18" />
    </>
  );
}

function SplitCardMotif() {
  return (
    <>
      <rect x="3" y="3" width="4" height="10" rx="1" fill="currentColor" fillOpacity="0.18" />
      <rect x="7.5" y="3" width="5.5" height="10" rx="1" fill="currentColor" fillOpacity="0.18" />
    </>
  );
}

function ThreeColumnMotif() {
  return (
    <>
      <rect x="3" y="3" width="2.5" height="10" rx="0.8" fill="currentColor" fillOpacity="0.16" />
      <rect x="6" y="3" width="4" height="10" rx="0.8" fill="currentColor" fillOpacity="0.3" />
      <rect x="10.5" y="3" width="2.5" height="10" rx="0.8" fill="currentColor" fillOpacity="0.16" />
    </>
  );
}

function StructureRegionMotif() {
  return (
    <>
      <rect x="3" y="3" width="10" height="2" rx="0.8" fill="currentColor" fillOpacity="0.2" />
      <rect x="3" y="6" width="3" height="7" rx="0.8" fill="currentColor" fillOpacity="0.18" />
      <rect x="7" y="6" width="6" height="5" rx="0.8" fill="currentColor" fillOpacity="0.24" />
      <rect x="7" y="11.5" width="6" height="1.5" rx="0.75" fill="currentColor" fillOpacity="0.16" />
    </>
  );
}

export function PhiBuilderIcon({ motif, size = 16 }: PhiBuilderIconProps) {
  return (
    <Frame size={size}>
      {motif === "content" ? <ContentMotif /> : null}
      {motif === "vertical" ? <VerticalMotif /> : null}
      {motif === "flex" ? <FlexMotif /> : null}
      {motif === "stack" ? <StackMotif /> : null}
      {motif === "grid" ? <GridMotif /> : null}
      {motif === "masonry" ? <MasonryMotif /> : null}
      {motif === "split-card" ? <SplitCardMotif /> : null}
      {motif === "three-column" || motif === "threecol" ? <ThreeColumnMotif /> : null}
      {motif === "structure-region" ? <StructureRegionMotif /> : null}
    </Frame>
  );
}
