import { describe, it, expect } from "vitest";
import { assertValidSourceTag } from "../src/tx/source-tag";
import { InvalidSourceTagError } from "../src/errors";
import { MAX_SOURCE_TAG } from "../src/constants";

describe("assertValidSourceTag", () => {
  it("accepte 0 et la borne max uint32", () => {
    expect(() => assertValidSourceTag(0)).not.toThrow();
    expect(() => assertValidSourceTag(MAX_SOURCE_TAG)).not.toThrow();
  });

  it("rejette un négatif", () => {
    expect(() => assertValidSourceTag(-1)).toThrow(InvalidSourceTagError);
  });

  it("rejette au-dessus de la borne uint32", () => {
    expect(() => assertValidSourceTag(MAX_SOURCE_TAG + 1)).toThrow(
      InvalidSourceTagError,
    );
  });

  it("rejette un non-entier", () => {
    expect(() => assertValidSourceTag(1.5)).toThrow(InvalidSourceTagError);
    expect(() => assertValidSourceTag(Number.NaN)).toThrow(InvalidSourceTagError);
  });
});
