import { afterEach, describe, expect, it } from "vitest";
import { readAdminToken, readOperatorUserIds } from "./env";

const KEYS = ["TIDE_ADMIN_TOKEN", "TIDE_OPERATOR_USER_IDS"] as const;

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
