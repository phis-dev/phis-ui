/** A heading the Markdown renderer found, as a table of contents lists it and links to it. */
export type PhiMarkdownTocHeading = {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  text: string;
};
