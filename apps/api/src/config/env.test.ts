import { afterEach, describe, expect, it } from "vitest";
import {
  readAdminToken,
  readOperatorUserIds,
  readSessionSecret,
  readSessionTtlSeconds,
} from "./env";

const KEYS = [
  "TIDE_ADMIN_TOKEN",
  "TIDE_OPERATOR_USER_IDS",
  "TIDE_SESSION_SECRET",
  "TIDE_SESSION_TTL",
] as const;

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
});

describe("readAdminToken", () => {
  it("renvoie undefined si absent", () => {
    expect(readAdminToken()).toBeUndefined();
  });
  it("renvoie le token configuré", () => {
    process.env["TIDE_ADMIN_TOKEN"] = "secret";
    expect(readAdminToken()).toBe("secret");
  });
});

describe("readOperatorUserIds", () => {
  it("renvoie [] si absent", () => {
    expect(readOperatorUserIds()).toEqual([]);
  });
  it("parse un CSV en ignorant espaces et entrées vides", () => {
    process.env["TIDE_OPERATOR_USER_IDS"] = " me , ,  test-2 ";
    expect(readOperatorUserIds()).toEqual(["me", "test-2"]);
  });
});

describe("readSessionSecret", () => {
  it("lève si absent (auth obligatoire au boot)", () => {
    expect(() => readSessionSecret()).toThrow();
  });
  it("lève si trop court", () => {
    process.env["TIDE_SESSION_SECRET"] = "trop-court";
    expect(() => readSessionSecret()).toThrow();
  });
  it("renvoie le secret suffisamment long", () => {
    process.env["TIDE_SESSION_SECRET"] = "a".repeat(32);
    expect(readSessionSecret()).toBe("a".repeat(32));
  });
});

describe("readSessionTtlSeconds", () => {
  it("défaut 24 h si absent", () => {
    expect(readSessionTtlSeconds()).toBe(24 * 60 * 60);
  });
  it("lève si non entier positif", () => {
    process.env["TIDE_SESSION_TTL"] = "0";
    expect(() => readSessionTtlSeconds()).toThrow();
  });
  it("lit une valeur en secondes", () => {
    process.env["TIDE_SESSION_TTL"] = "3600";
    expect(readSessionTtlSeconds()).toBe(3600);
  });
});
