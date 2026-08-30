export function isPhiExternalHref(href: string) {
  return /^(https?:)?\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}
