export type PhiTextInputType =
  | "text"
  | "url"
  | "phone"
  | "email"
  | "password"
  | "search"
  /*
   * A code sent to a device or read off an authenticator: typed as text, so a leading zero survives, but
   * offered with the digit keypad on a phone, which is what a person entering six digits wants.
   */
  | "one-time-code";
