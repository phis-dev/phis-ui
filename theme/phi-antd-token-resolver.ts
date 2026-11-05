import type { AliasToken, SeedToken } from "antd/es/theme/interface";
import darkAlgorithm from "antd/es/theme/themes/dark";
import { generateColorPalettes as generateDarkColorPalettes } from "antd/es/theme/themes/dark/colors";
import defaultAlgorithm from "antd/es/theme/themes/default";
import seedToken from "antd/es/theme/themes/seed";
import formatToken from "antd/es/theme/util/alias";

import type { PhiThemeMode } from "./phi-theme-presets";

function normalizePhiAntdThemeIdentity(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizePhiAntdThemeIdentity);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined && typeof entry !== "function" && typeof entry !== "symbol")
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, entry]) => [key, normalizePhiAntdThemeIdentity(entry)]),
    );
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

function hashPhiAntdThemeIdentity(value: unknown) {
  const serialized = JSON.stringify(normalizePhiAntdThemeIdentity(value));
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function createPhiAntdThemeCssVarKey(scope: string, identity: unknown) {
  const normalizedScope = scope
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "theme";
  return `phi-${normalizedScope}-${hashPhiAntdThemeIdentity(identity)}`;
}

/*
 * A link and an info colour pointed at turn lighter in the dark mode, as a primary button does.
 *
 * Ant Design takes both hovers from step 4 of the colour's palette in either mode. In the light palette
 * that step is a lighter tint; the dark algorithm reorders its palette so the low steps fade into the dark
 * ground for borders and fills, and step 4 there is the border's -- darker than the colour itself, so a
 * link went dim on a dark ground when pointed at (#3867b5 to #274069 on #08153a). The primary hover takes
 * step 5, which in the dark palette is the lighter one; these take it too. A hover a Theme states itself
 * still wins: `formatToken` lays the stated tokens over this.
 */
function withPhiDarkHoverSteps<T extends object>(seed: SeedToken, derived: T): T {
  const linkBase = seed.colorLink || seed.colorInfo;
  return {
    ...derived,
    ...(linkBase ? { colorLinkHover: generateDarkColorPalettes(linkBase)[5] } : {}),
    ...(seed.colorInfo ? { colorInfoHover: generateDarkColorPalettes(seed.colorInfo)[5] } : {}),
  };
}

export function resolvePhiAntdAliasTokens(
  mode: PhiThemeMode,
  token: Record<string, unknown>,
) {
  const mergedSeedToken = {
    ...seedToken,
    ...token,
  } as SeedToken;
  const derivativeToken =
    mode === "dark"
      ? withPhiDarkHoverSteps(mergedSeedToken, darkAlgorithm(mergedSeedToken))
      : defaultAlgorithm(mergedSeedToken);

  return formatToken({
    ...derivativeToken,
    override: token,
  } as Parameters<typeof formatToken>[0]) as AliasToken & Record<string, unknown>;
}
