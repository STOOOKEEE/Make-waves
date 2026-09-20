import { describe, expect, it, vi } from "vitest";
import { SupabaseIdentityVerifier } from "./external-auth";

describe("SupabaseIdentityVerifier", () => {
  it("vérifie le token auprès du endpoint user sans le persister", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toEqual({ apikey: "publishable-key-long-enough", authorization: "Bearer external-access-token-long" });
      return new Response(JSON.stringify({
        id: "subject-1",
        email: "Alice@Example.com",
        app_metadata: { provider: "x" },
      }), { status: 200 });
    });
    const verifier = new SupabaseIdentityVerifier({
      baseUrl: "https://project.supabase.co/",
      publishableKey: "publishable-key-long-enough",
      fetch: fetcher as typeof fetch,
    });

    await expect(verifier.verify("external-access-token-long")).resolves.toEqual({
      issuer: "https://project.supabase.co",
      subject: "subject-1",
      provider: "x",
      email: "alice@example.com",
    });
  });

  it("refuse un token rejeté par le fournisseur", async () => {
    const verifier = new SupabaseIdentityVerifier({
      baseUrl: "https://project.supabase.co",
      publishableKey: "publishable-key-long-enough",
      fetch: vi.fn(async () => new Response("{}", { status: 401 })) as typeof fetch,
    });
    await expect(verifier.verify("external-access-token-long")).rejects.toThrow("invalide");
  });
});
