"use client";

import { handleISRError } from "next/dist/client/components/handle-isr-error";

/**
 * What is left when there is nothing left.
 *
 * Every other refusal this Site answers is a Page: `/error/401`, `/error/403` and `/error/404` are
 * Public route presets, they resolve a CMS tree, and a Site may edit what they say. A 500 cannot be
 * one of them. It is the answer given when rendering failed, and the first thing a failed render
 * takes away is the ability to render -- the Site config, the Theme, the locale and the Module
 * registry all arrive through the same machinery that just broke, so a 500 that asked the CMS for its
 * own text would be asking the thing that failed to explain the failure.
 *
 * So this is a fixed page, and the preset for `/error/500` was removed rather than left standing: a
 * Page in the Builder that is never the one shown is worse than no Page at all, because somebody
 * edits it and waits for a change that cannot come.
 *
 * It sits at `global-error` rather than at an `error` boundary further down because the root Layout is
 * itself a plausible thrower -- it fetches the Site, folds in the Theme blocks and resolves the font
 * Assets -- and an error boundary below a Layout does not catch that Layout. Being the outermost
 * boundary means it replaces the document, which is why it renders `<html>` and `<body>` itself and
 * why nothing here may reach for a provider: at this point in a failed render there are none.
 *
 * `color-scheme` does the theming instead. `Canvas` and `CanvasText` are the browser's own pair and
 * follow the viewer's light or dark preference without a stylesheet, which is the only kind of theme
 * this page can honestly claim to have.
 */
export function PhiNextGlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  /*
   * A static render does not get an error page, it gets the error.
   *
   * The `static-render` routes are `force-static` with a sixty second revalidate, so a request that
   * reaches them is a static generation and whatever it produces is stored under the Site's change
   * marker. Swallowing a failure into this page there would cache the failure: every visitor for the
   * next minute would be served a 500 document that no longer has anything wrong with it. Next's own
   * global error calls the same helper for the same reason, and handing the error back is what makes
   * the render fail instead of succeed with a broken body.
   *
   * It is an internal import. There is no published equivalent, and the alternative -- leaving the
   * built-in page in place to keep the behaviour -- would mean the Site has no error page of its own.
   */
  handleISRError({ error });

  return (
    <html lang="en" style={{ colorScheme: "light dark" }}>
      <body
        style={{
          alignItems: "center",
          background: "Canvas",
          boxSizing: "border-box",
          color: "CanvasText",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100vh",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <title>Something went wrong</title>
        <h1 style={{ fontSize: "2rem", lineHeight: 1.2, margin: 0 }}>Something went wrong</h1>
        <p style={{ fontSize: "1rem", lineHeight: 1.5, margin: "0.75rem 0 0" }}>
          The page could not be rendered.
        </p>
        {/*
          * Rendering again is the only way out worth offering.
          *
          * The 404 sends its visitor to the root of the Area that refused them, because for a missing
          * Page that root is somewhere they may go. Here it is not: the address is not the problem,
          * and the Area root is rendered by the same machinery that just failed. A retry is the honest
          * offer -- a transient failure clears, a permanent one says so again.
          */}
        <button
          type="button"
          onClick={reset}
          style={{
            background: "transparent",
            border: "1px solid currentColor",
            borderRadius: "0.25rem",
            color: "inherit",
            cursor: "pointer",
            font: "inherit",
            margin: "1.5rem 0 0",
            padding: "0.5rem 1.25rem",
          }}
        >
          Try again
        </button>
        {/*
          * The digest, when the server made one.
          *
          * It is the hash Next puts in the server log beside the stack it withheld from the response,
          * and it is the only thing a visitor can carry to support that identifies their failure. It
          * says nothing about what went wrong, which is why it is safe to show.
          */}
        {error.digest ? (
          <p
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.75rem",
              margin: "1.5rem 0 0",
              opacity: 0.6,
            }}
          >
            {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
