import { describe, it, expect } from "vitest";
import { parseInline } from "../src/lib/inline-markdown";

describe("parseInline", () => {
  it("texte brut → un seul segment texte", () => {
    expect(parseInline("hello world")).toEqual([{ t: "text", v: "hello world" }]);
  });

  it("gras + code entourés de texte", () => {
    expect(parseInline("XRP is **$1.08** via `get_market`")).toEqual([
      { t: "text", v: "XRP is " },
      { t: "bold", v: "$1.08" },
      { t: "text", v: " via " },
      { t: "code", v: "get_market" },
    ]);
  });

  it("préserve les retours à la ligne dans les segments texte", () => {
    expect(parseInline("line1\nline2")).toEqual([{ t: "text", v: "line1\nline2" }]);
  });

  it("un `**` orphelin reste du texte brut (jamais interprété)", () => {
    expect(parseInline("a ** b")).toEqual([{ t: "text", v: "a ** b" }]);
  });

  it("chaîne vide → aucun segment", () => {
    expect(parseInline("")).toEqual([]);
  });
});
