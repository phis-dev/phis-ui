"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { PhiRuntimePageConditionState } from "../../types/runtime-condition";

/**
 * The address of the page as the visitor opened it, which is what a `page` condition reads.
 *
 * Repeated parameters collapse to the first, because a condition asks what the page is about and a
 * second `?token=` is not a second subject.
 */
export function usePhiRuntimePageConditionState(): PhiRuntimePageConditionState {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  return useMemo(() => {
    const query: Record<string, string> = {};
    for (const [key, value] of new URLSearchParams(search)) {
      if (!(key in query)) query[key] = value;
    }
    return { path: pathname ?? "", query };
  }, [pathname, search]);
}
