"use client";

import type { ReactNode } from "react";
import { px2remTransformer, StyleProvider } from "@ant-design/cssinjs";

type PhiRootRemProviderProps = {
  rootValue: number;
  children: ReactNode;
};

function resolveFinitePositiveNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function PhiRootRemProvider({ rootValue, children }: PhiRootRemProviderProps) {
  const transformer = px2remTransformer({
    rootValue: resolveFinitePositiveNumber(rootValue, 16),
    precision: 5,
    mediaQuery: false,
  });

  return <StyleProvider transformers={[transformer]}>{children}</StyleProvider>;
}
