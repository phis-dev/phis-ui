/**
 * A byte count shown as megabytes, and read back as bytes.
 *
 * Every storage limit in the system is stored, validated and enforced in bytes, and that is right: a
 * byte is what a file weighs and what a quota counts. It is not what an administrator thinks in. A
 * field asking for 52428800 is asking somebody to do arithmetic to find out whether it says fifty
 * megabytes or five hundred, and to do it again every time they read the page.
 *
 * So the conversion lives here and nowhere else. The value a form holds is always bytes -- the
 * Control converts on the way in and on the way out, so nothing downstream ever sees a half-converted
 * number, and a submit handler needs to know nothing about units.
 */

/**
 * A megabyte is 1 048 576 bytes here, not 1 000 000.
 *
 * The decimal reading is what the SI prefix means, and the binary one is what every tool that sets a
 * storage limit uses: nginx's `client_max_body_size`, PHP's `upload_max_filesize`, `ls -lh`. The
 * limits already stored were written by somebody counting in the binary one, so dividing by a million
 * would show 50 MiB as "52.43" and quietly shrink the limit the moment somebody rounded it back down.
 *
 * The label still says MB, because "MiB" appears in no upload dialog an author has ever seen.
 */
export const PHI_STORAGE_SIZE_UNIT_BYTES = 1_048_576;

export const PHI_STORAGE_SIZE_UNIT_LABEL = "MB";

/**
 * How precisely a size may be stated, in the unit above.
 *
 * Two places is about ten kilobytes, which is finer than any limit anybody sets on purpose and coarse
 * enough that the field does not show a number like 4.76837158203125. A stored size that is not a
 * round count of megabytes therefore displays rounded -- but it is only ever written back when
 * somebody edits the field, so reading the page cannot change what it says.
 */
export const PHI_STORAGE_SIZE_PRECISION = 2;

export function phiBytesToStorageSize(bytes: unknown): number | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return null;
  const units = bytes / PHI_STORAGE_SIZE_UNIT_BYTES;
  const factor = 10 ** PHI_STORAGE_SIZE_PRECISION;
  return Math.round(units * factor) / factor;
}

/** Bytes are whole, so the product is rounded rather than carried at whatever fraction it lands on. */
export function phiStorageSizeToBytes(size: number | null): number | null {
  if (typeof size !== "number" || !Number.isFinite(size)) return null;
  return Math.round(size * PHI_STORAGE_SIZE_UNIT_BYTES);
}
