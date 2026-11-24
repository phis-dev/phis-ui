/**
 * The code of a read the Provider refuses for this reader, on purpose and for a reason the reader may be
 * told -- their own customer file, which nobody opens. A Provider throws `PhiTableProviderError` with it
 * and the sentence; the Table draws itself with the sentence where its rows would be, live as in the
 * Builder, and keeps its tools, so the reader can ask for something else. Any other failed read is the
 * source's fault and ends the Table (TABLES.md, "A refused read").
 *
 * Nothing is imported here: the Markdown body reads the code in every Area's Public chunk.
 */
export const PHI_TABLE_PROVIDER_REFUSED_CODE = "refused";

export function isPhiTableProviderRefusal(error: { code: string } | null | undefined): boolean {
  return error?.code === PHI_TABLE_PROVIDER_REFUSED_CODE;
}
