/**
 * The outcomes a Result body can show. The Foundation's, because the body that draws them is: the Core
 * Result Widget places it, and so does anything else that ends a journey on a page.
 */
export type PhiResultWidgetVisualStatus =
  | "success"
  | "error"
  | "info"
  | "warning"
  | "403"
  | "404"
  | "500";
