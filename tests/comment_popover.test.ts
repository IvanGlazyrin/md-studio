import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommentPopover } from "../src/components/docs/comments/CommentPopover";

describe("CommentPopover Accessibility and UX", () => {
  it("renders comment popover with accessible textarea aria-label and submit button", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommentPopover, {
        line: 42,
        top: 100,
        notes: [],
        onClose: () => {},
        onCreate: async () => {},
        onDelete: () => {},
      })
    );

    expect(html).toContain('aria-label="Заметки к строке 42"');
    expect(html).toContain('aria-label="Текст заметки"');
    expect(html).toContain("Сохранить");
    expect(html).toContain("focus-visible:ring-2");
  });
});
