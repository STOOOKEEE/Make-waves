import { describe, it, expect } from "vitest";
import { convertHexToString } from "xrpl";
import { encodeMemo } from "../src/tx/memo";
import { InvalidMemoError } from "../src/errors";

describe("encodeMemo", () => {
  it("encode la charge utile en hexadécimal réversible", () => {
    const { Memo } = encodeMemo({ data: "comp-42" });
    expect(Memo.MemoData).toBeDefined();
    expect(convertHexToString(Memo.MemoData as string)).toBe("comp-42");
  });

  it("encode type et format quand fournis", () => {
    const { Memo } = encodeMemo({
      type: "tide/join",
      data: "comp-42",
      format: "text/plain",
    });
    expect(convertHexToString(Memo.MemoType as string)).toBe("tide/join");
    expect(convertHexToString(Memo.MemoFormat as string)).toBe("text/plain");
  });

  it("omet type et format quand absents", () => {
    const { Memo } = encodeMemo({ data: "comp-42" });
    expect(Memo.MemoType).toBeUndefined();
    expect(Memo.MemoFormat).toBeUndefined();
  });

  it("rejette une charge utile vide", () => {
    expect(() => encodeMemo({ data: "" })).toThrow(InvalidMemoError);
    expect(() => encodeMemo({ data: "   " })).toThrow(InvalidMemoError);
  });

  it("produit un hexadécimal en majuscules (convention XRPL)", () => {
    const { Memo } = encodeMemo({ data: "zZ" });
    expect(Memo.MemoData).toMatch(/^[0-9A-F]+$/);
  });
});
