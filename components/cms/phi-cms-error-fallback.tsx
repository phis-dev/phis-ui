import type { PhiCmsErrorCode } from "../../constants/cms-error-pages";

const ERROR_COPY: Record<PhiCmsErrorCode, { title: string; text: string }> = {
  401: {
    title: "Not authorized",
    text: "You are not authorized to view this page.",
  },
  403: {
    title: "Not authorized",
    text: "You are not allowed to view this page.",
  },
  404: {
    title: "Not found",
    text: "This page could not be found.",
  },
};

/**
 * The refusal in plain words, needing nothing but its code.
 *
 * Shown where the Site's own error page cannot be had -- no Site key, a resolution that failed -- and
 * first, by the deferred refusal route, until the Site's page has arrived. It reads nothing and renders
 * on either side, which is why it lives apart from the error page that resolves.
 */
export function PhiCmsErrorFallback({ code }: { code: PhiCmsErrorCode }) {
  const copy = ERROR_COPY[code];

  return (
    <main
      style={{
        alignItems: "center",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: "40vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", lineHeight: 1.2, margin: 0 }}>{copy.title}</h1>
      <p style={{ fontSize: "1rem", lineHeight: 1.5, margin: "0.75rem 0 0" }}>{copy.text}</p>
    </main>
  );
}
