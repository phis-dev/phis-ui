/**
 * Deletes a stored CMS draft through the Site's CMS routes.
 *
 * Any Module that keeps drafts discards them the same way -- the Builder its page and Module drafts, the
 * Revisions page an Area's own shell -- so the call is the Foundation's, and the path says which draft.
 * Non-empty string values of `payload` become the query; the route's error is thrown as it came back.
 */
export async function deleteCmsDraft(path: string, payload: Record<string, unknown>) {
  const url = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && value.trim().length > 0) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string; details?: string[] } | null;
    const detail = body?.details?.length ? ` ${body.details.join(" ")}` : "";
    throw new Error(`${body?.error ?? "CMS draft delete failed."}${detail}`);
  }
}
