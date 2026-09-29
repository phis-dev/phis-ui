// @vitest-environment happy-dom
import { expect, test } from "vitest";
import { render } from "@testing-library/react";

import { PhiInlineTextEditor } from "./inline-text-editor";

test("probe: what the field carries", () => {
  const { container } = render(
    <PhiInlineTextEditor
      value="A warm welcome"
      variant="underlined"
      size="small"
      fitContent
      placeholder="Text"
      inputStyle={{ paddingInline: 0, fontSize: 14, lineHeight: 1.6 }}
      style={{ minWidth: 0, flex: "0 0 auto", maxWidth: "100%" }}
      onChange={() => undefined}
      onCommit={() => undefined}
      onCancel={() => undefined}
    />,
  );
  const field = container.querySelector("textarea, input");
  console.log("TAG:", field?.tagName);
  console.log("CLASS:", field?.getAttribute("class"));
  console.log("STYLE:", field?.getAttribute("style"));
  console.log("PARENT:", field?.parentElement?.tagName, field?.parentElement?.getAttribute("class"));
  console.log("HTML:", container.innerHTML.slice(0, 1200));
  expect(field).toBeTruthy();
});
