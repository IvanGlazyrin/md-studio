import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS_PATH = join(process.cwd(), "src/app/globals.css");

describe("ghost-link styling (backlog 2.2)", () => {
  const css = readFileSync(CSS_PATH, "utf8");

  it("declares a .ghost-link rule", () => {
    expect(css).toContain(".ghost-link");
  });

  it("gives ghost links the dashed underline affordance", () => {
    const start = css.indexOf(".ghost-link");
    expect(start).toBeGreaterThan(-1);
    // Bound the window at the rule's own closing brace. A fixed +400 window
    // reaches past the end of @layer components into the unlayered .leaflet-*
    // and Prism rules below, where a stray `cursor:` would satisfy the
    // assertion without the ghost-link rule having anything to do with it.
    const block = css.slice(start, css.indexOf("}", start));
    expect(block).toMatch(/border-bottom-style:\s*dashed/);
  });

  it("marks ghost links as not interactive", () => {
    const start = css.indexOf(".ghost-link");
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf("}", start));
    expect(block).toMatch(/cursor:\s*not-allowed/);
  });

  it("places the rule inside @layer components so utilities can override it", () => {
    const layerStart = css.indexOf("@layer components");
    expect(layerStart).toBeGreaterThan(-1);
    // An unlayered rule never beats a utility: layer order is evaluated before
    // specificity, and an unlayered rule sits after @layer utilities. So the
    // rule must fall strictly INSIDE the block — checking only that it appears
    // after the opening brace would pass for every unlayered rule below it.
    const layerEnd = css.indexOf("\n}", layerStart);
    expect(layerEnd).toBeGreaterThan(layerStart);
    const rule = css.indexOf(".ghost-link");
    expect(rule).toBeGreaterThan(layerStart);
    expect(rule).toBeLessThan(layerEnd);
  });
});
