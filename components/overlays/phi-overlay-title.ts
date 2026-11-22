import { useCallback, useState } from "react";

/*
 * The title an Overlay shows: the one its config states, or one it was told on its `title` input.
 *
 * A told title stands for the opening it was told for: closing forgets it, so the next opening -- for
 * another row, with a Form that has not read that row yet -- starts from the Overlay's own title rather
 * than from the last row's name. A title told while the Overlay is closed is for the opening that comes
 * next, which is how a Controller names the mode it is about to open in. An empty title is no title:
 * the Overlay shows its own again, which is what a Form answers for a record that has no value to name
 * it by. A changed config, or a remount, starts from the config's title as well.
 */
export function usePhiOverlayTitle<TConfig extends { title: string | null }>(config: TConfig) {
  const [told, setTold] = useState<{ config: TConfig; value: string } | null>(null);
  const title = told?.config === config ? told.value : config.title;
  const tell = useCallback((value: unknown) => {
    const next = typeof value === "string" ? value.trim() : "";
    setTold(next ? { config, value: next } : null);
  }, [config]);
  const forget = useCallback(() => setTold(null), []);
  return { title, tell, forget };
}
