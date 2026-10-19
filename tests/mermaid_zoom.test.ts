import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MermaidDiagram } from "../src/components/docs/MermaidDiagram";

describe("MermaidDiagram viewer (react-zoom-pan-pinch)", () => {
  it("exports component", () => {
    expect(typeof MermaidDiagram).toBe("function");
  });

  it("renders loading state on server (mermaid loads client-side)", () => {
    const html = renderToStaticMarkup(
      React.createElement(MermaidDiagram, { chart: "graph TD; A-->B" })
    );
    expect(html).toContain("Загрузка диаграммы");
  });

  it("zoom library is available", async () => {
    const lib = await import("react-zoom-pan-pinch");
    expect(typeof lib.TransformWrapper).toBeDefined();
    expect(typeof lib.TransformComponent).toBeDefined();
    expect(typeof lib.useControls).toBe("function");
  });
});
