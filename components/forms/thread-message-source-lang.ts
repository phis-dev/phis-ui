/*
 * The two names of the message-language picker that the relay reads as well as the Form (THREADS.md
 * section 9). Alone in a file so the gateway, which shapes every relayed request, imports these two
 * strings and not the Form contract the picker's field is built from.
 */

/** The value's name, which is the name Core's Site routes take it under and `PhisThreadMessage` reads it back as. */
export const PHI_THREAD_MESSAGE_SOURCE_LANG_FIELD_KEY = "sourceLang";

/**
 * "Other language": the writer declares nothing; the language is detected when somebody translates the message.
 *
 * The Form's own value only. A Form option cannot be empty, so the choice has a name here, and the relay
 * leaves `sourceLang` out of the request when it holds it (`shapePhiFormHandlerRequest`): it never reaches
 * Core, which reads an absent language as not declared. `@phis/support` spells the same value.
 */
export const PHI_THREAD_MESSAGE_OTHER_LANGUAGE_VALUE = "other";
