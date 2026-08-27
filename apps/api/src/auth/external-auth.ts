import type { ExternalIdentity } from "../store/external-identity-store";

export class ExternalAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalAuthError";
  }
}

export interface ExternalIdentityVerifier {
  verify(accessToken: string): Promise<ExternalIdentity>;
}

export interface SupabaseVerifierConfig {
  readonly baseUrl: string;
  readonly publishableKey: string;
  readonly fetch?: typeof globalThis.fetch;
}

/** Vérifie le token auprès de Supabase Auth ; aucun token fournisseur n'est stocké. */
export class SupabaseIdentityVerifier implements ExternalIdentityVerifier {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly issuer: string;

  constructor(private readonly config: SupabaseVerifierConfig) {
    this.fetcher = config.fetch ?? globalThis.fetch;
    this.issuer = config.baseUrl.replace(/\/$/, "");
  }

  async verify(accessToken: string): Promise<ExternalIdentity> {
    const token = accessToken.trim();
    if (token.length < 20 || token.length > 16_384) {
      throw new ExternalAuthError("token d'identité invalide");
    }
    let response: Response;
    try {
      response = await this.fetcher(`${this.issuer}/auth/v1/user`, {
        headers: {
          apikey: this.config.publishableKey,
          authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new ExternalAuthError("service d'identité indisponible");
    }
    if (!response.ok) throw new ExternalAuthError("session email/social invalide ou expirée");
    const body = (await response.json()) as Record<string, unknown>;
    const subject = typeof body["id"] === "string" ? body["id"].trim() : "";
    if (subject === "") throw new ExternalAuthError("identité externe sans sujet");
    const appMetadata =
      typeof body["app_metadata"] === "object" && body["app_metadata"] !== null
        ? (body["app_metadata"] as Record<string, unknown>)
        : {};
    const provider =
      typeof appMetadata["provider"] === "string" && appMetadata["provider"].trim() !== ""
        ? appMetadata["provider"].trim()
        : "email";
    const email = typeof body["email"] === "string" ? body["email"].trim().toLowerCase() : null;
    return { issuer: this.issuer, subject, provider, email: email === "" ? null : email };
  }
}
