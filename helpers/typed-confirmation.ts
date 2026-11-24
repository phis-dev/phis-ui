/**
 * Whether what somebody typed to confirm an act is the word they were asked for.
 *
 * A threshold against reflex, not a password: the word is shown to them to type (or copy), so its case
 * and the spaces a copy brings along around it are not what is being checked. Asked to write "app" out,
 * "App" or " app " was refused -- the person had done exactly what was asked and was told it was wrong.
 * Every type-to-confirm in this package compares through here, so they all accept the same answers.
 */
export function matchesPhiTypedConfirmation(typed: unknown, expected: string) {
  const word = expected.trim();
  return typeof typed === "string" && word.length > 0 &&
    typed.trim().toLocaleLowerCase("en") === word.toLocaleLowerCase("en");
}
