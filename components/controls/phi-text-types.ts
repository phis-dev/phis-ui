export type PhiTextInputType =
  | "text"
  | "url"
  | "phone"
  | "email"
  | "password"
  | "search"
  /*
   * A string of digits -- a code read off an authenticator, a postcode, an account number. Typed as
   * text, so a leading zero survives and nothing is summed or rounded, but offered with the digit keypad
   * on a phone. Named for what is entered rather than for one thing it is used for.
   */
  | "digits";
