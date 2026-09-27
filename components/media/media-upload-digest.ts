import {
  resolvePhiMediaUploadPartCount,
  resolvePhiMediaUploadPartSizeBytes,
} from "@phis/contracts/media";

/**
 * What the Client can say about a file before it sends it, so the storage can hold it to it.
 *
 * The digest is not a courtesy. The Server signs it into the upload request, and the storage endpoint
 * refuses a body that does not match -- which is what lets a figure computed here be recorded as fact
 * about an object nobody in the control plane ever saw. Without it a direct upload lands with whatever
 * the Provider happens to put in an ETag, and duplicate detection has nothing it is willing to compare.
 *
 * Two shapes, and which one applies follows from the size:
 *
 * - Up to one part, the digest of the whole file.
 * - Above that, one digest per part, in order. The Server folds them into the composite the assembled
 *   object will carry and signs each one into its own part request.
 *
 * The reason for the second shape is Web Crypto: `crypto.subtle.digest` takes one buffer and there is no
 * incremental form, so hashing a two-gigabyte file whole means holding two gigabytes in memory. Per part
 * the most that is ever resident is one part. The division is `resolvePhiMediaUploadPartSizeBytes`, the
 * same rule the Provider addresses the parts with -- computed on both sides rather than negotiated,
 * because the Server has to know the digests before it can sign anything and the Client has to know the
 * boundaries before there is a plan to read them from.
 */
export type PhiMediaClientDigest =
  | { sha256: string }
  | { partSha256: string[] };

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digestBlob(blob: Blob) {
  return toHex(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
}

/**
 * Hashes a file the way the upload will be divided, or answers null where it cannot.
 *
 * Null rather than a throw, and not an error the person sees: a digest is what makes duplicate detection
 * and endpoint-side verification possible, and an upload without one is worse off but perfectly valid.
 * `crypto.subtle` is absent on an insecure origin, and a file the browser cannot read again -- moved or
 * changed since it was picked -- fails here as it would later. Neither is a reason to refuse the upload.
 *
 * Parts are hashed one after another on purpose. Each one is read into memory to be hashed, so hashing
 * them together would put the whole file there and defeat the reason for dividing it at all.
 */
export async function buildPhiMediaClientDigest(file: File): Promise<PhiMediaClientDigest | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;

  try {
    const partSizeBytes = resolvePhiMediaUploadPartSizeBytes(file.size);
    if (file.size <= partSizeBytes) {
      return { sha256: await digestBlob(file) };
    }

    const partSha256: string[] = [];
    const partCount = resolvePhiMediaUploadPartCount(file.size);
    for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
      const start = (partNumber - 1) * partSizeBytes;
      partSha256.push(await digestBlob(file.slice(start, Math.min(start + partSizeBytes, file.size))));
    }
    return { partSha256 };
  } catch {
    return null;
  }
}
