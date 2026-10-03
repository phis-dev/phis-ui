import type { InputRef } from "antd/es/input";
import type { TextAreaRef } from "antd/es/input/TextArea";

/**
 * What a ref on PhiTextControl's field reaches: focus, blur, selection. Named here so a Widget holding
 * one types against the Control rather than against the primitive drawn inside it.
 */
export type PhiTextControlInputRef = InputRef;
export type PhiTextControlTextAreaRef = TextAreaRef;

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
