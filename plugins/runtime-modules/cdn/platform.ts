import { PhisCdnFileArch, PhisCdnFileOs } from "@phis/contracts/addon";

/**
 * A file's platform as the CDN page shows and asks it: the `PhisCdnFileOs` and `PhisCdnFileArch` bits of
 * the contract, one word each. The words are keys, not names -- the Page's Label Set says what each is
 * called -- so the table's tags, the record's and the upload dialog's checkboxes read from one list.
 */
export const PHI_CDN_OS_KEYS = [
  ["linux", PhisCdnFileOs.Linux],
  ["windows", PhisCdnFileOs.Windows],
  ["macos", PhisCdnFileOs.MacOS],
  ["android", PhisCdnFileOs.Android],
  ["ios", PhisCdnFileOs.IOS],
  ["chromeos", PhisCdnFileOs.ChromeOS],
  ["other", PhisCdnFileOs.Other],
] as const;

export const PHI_CDN_ARCH_KEYS = [
  ["x64", PhisCdnFileArch.X64],
  ["arm64", PhisCdnFileArch.Arm64],
  ["x86", PhisCdnFileArch.X86],
  ["arm32", PhisCdnFileArch.Arm32],
  ["riscv64", PhisCdnFileArch.RiscV64],
] as const;

export type PhiCdnOsKey = (typeof PHI_CDN_OS_KEYS)[number][0];
export type PhiCdnArchKey = (typeof PHI_CDN_ARCH_KEYS)[number][0];

function readBits<TKey extends string>(entries: readonly (readonly [TKey, number])[], bits: number): TKey[] {
  return entries.filter(([, bit]) => (bits & bit) !== 0).map(([key]) => key);
}

function writeBits<TKey extends string>(entries: readonly (readonly [TKey, number])[], keys: readonly string[]) {
  return entries.reduce((bits, [key, bit]) => (keys.includes(key) ? bits | bit : bits), 0);
}

export function readPhiCdnOsKeys(bits: number): PhiCdnOsKey[] {
  return readBits(PHI_CDN_OS_KEYS, bits);
}

export function readPhiCdnArchKeys(bits: number): PhiCdnArchKey[] {
  return readBits(PHI_CDN_ARCH_KEYS, bits);
}

export function writePhiCdnOsBits(keys: readonly string[]) {
  return writeBits(PHI_CDN_OS_KEYS, keys);
}

export function writePhiCdnArchBits(keys: readonly string[]) {
  return writeBits(PHI_CDN_ARCH_KEYS, keys);
}

/** The OS tags, then the architecture tags, of one file: what the table's `platform` column draws. */
export function readPhiCdnPlatformTags(os: number, arch: number): string[] {
  return [...readPhiCdnOsKeys(os), ...readPhiCdnArchKeys(arch)];
}

const OS_BY_EXTENSION: Readonly<Record<string, number>> = {
  dmg: PhisCdnFileOs.MacOS,
  pkg: PhisCdnFileOs.MacOS,
  exe: PhisCdnFileOs.Windows,
  msi: PhisCdnFileOs.Windows,
  deb: PhisCdnFileOs.Linux,
  rpm: PhisCdnFileOs.Linux,
  apk: PhisCdnFileOs.Android,
};

/*
 * The architecture a file name states, by the words packagers use: Debian's `amd64` and `arm64`, the
 * kernel's `x86_64` and `aarch64`. Read as words between separators, so `x86_64` is x64 and never x86,
 * and a name that only contains the letters (`farm64ers`) states nothing.
 */
const ARCH_WORDS: readonly (readonly [RegExp, number])[] = [
  [/(?:^|[^a-z0-9])(?:amd64|x86_64)(?:$|[^a-z0-9])/iu, PhisCdnFileArch.X64],
  [/(?:^|[^a-z0-9])(?:arm64|aarch64)(?:$|[^a-z0-9])/iu, PhisCdnFileArch.Arm64],
];

/**
 * What a file name says of its platform, for the upload dialog to start from: the OS from the extension
 * (`.dmg`/`.pkg` macOS, `.exe`/`.msi` Windows, `.deb`/`.rpm` Linux, `.apk` Android), the architecture
 * from a word in the name. A guess the person corrects, never what is recorded unasked; 0 where the
 * name says nothing.
 */
export function guessPhiCdnPlatform(fileName: string): { os: number; arch: number } {
  const extension = /\.([a-z0-9]+)$/iu.exec(fileName)?.[1]?.toLowerCase() ?? "";
  const arch = ARCH_WORDS.reduce((bits, [pattern, bit]) => (pattern.test(fileName) ? bits | bit : bits), 0);
  return { os: OS_BY_EXTENSION[extension] ?? 0, arch };
}
