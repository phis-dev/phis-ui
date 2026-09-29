import { readPhiJsonError, readPhiJsonPayload } from "../../../../helpers/client-json-request";
import { PhiTableProviderError } from "../../../../types/table-widget";

export type ReadPhiTableProviderResponseOptions = {
  /** Who was asked, for the sentence a refusal without one of its own gets: "Groups request failed". */
  subject: string;
  /** Which body keys carry the refusal, in order. Default `error`. */
  errorKeys?: readonly string[];
};

/**
 * A Table Provider's answer from its route, or the `request-failed` error the Table shows for it.
 *
 * Five Providers carried this reader word for word apart from the subject in the fallback sentence
 * and whether `message` is read before `error`. A Table Provider fails in its own vocabulary
 * (`PhiTableProviderError`), which is why this is not the plain `readPhiJsonError`.
 */
export async function readPhiTableProviderResponse<T>(
  response: Response,
  { subject, errorKeys }: ReadPhiTableProviderResponseOptions,
): Promise<T | null> {
  const payload = await readPhiJsonPayload<T>(response);
  if (!response.ok) {
    throw new PhiTableProviderError(
      "request-failed",
      readPhiJsonError(payload, `${subject} request failed with status ${response.status}.`, errorKeys),
    );
  }
  return payload;
}
