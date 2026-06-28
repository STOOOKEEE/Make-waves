import { describe, it, expect } from "vitest";
import type { FastifyInstance } from "fastify";
import type { AttributionMetrics } from "@tide/xrpl";
import { buildServer } from "../src/http/server";
import type { MetricsReader, ServerDeps } from "../src/http/server";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import type {
  XamanCreatedPayload,
  XamanPayloadApi,
} from "../src/xaman/sign-request";

// Adresses XRPL valides (figées pour des tests stables ; apps/api ne dépend pas
// directement d'xrpl).
const ACCOUNT = "rPh1pu5PSEPBv45NWPYTN7gUEMmaGNePGY";
const POOL = "r3ZrdNvM99kxJjtYXL7twctbexdeCyD9hp";
const ISSUER = "rBHYF7U1FLhG9ZWcyhRL9Rytrvx5ARBAUK";
const SOURCE_TAG = 7777;

const PAYLOAD: XamanCreatedPayload = {
  uuid: "u-1",
  next: { always: "https://xumm.app/sign/u-1" },
  refs: { qr_png: "https://xumm.app/qr/u-1.png" },
};

/** Faux SDK Xaman : capture la tx envoyée et renvoie une réponse contrôlée. */
class FakeApi implements XamanPayloadApi {
  lastTxjson: Record<string, unknown> | undefined;
  constructor(private readonly result: XamanCreatedPayload | null) {}
  async create(payload: {
    txjson: object;
  }): Promise<XamanCreatedPayload | null> {
    this.lastTxjson = payload.txjson as Record<string, unknown>;
    return this.result;
  }
}

function baseDeps(): ServerDeps {
  return {
    paper: new PaperService(1000),
    competition: new CompetitionService(),
    getPrices: () => ({}),
  };
}

function withSign(api: XamanPayloadApi): FastifyInstance {
  return buildServer({
    ...baseDeps(),
    sign: { api, sourceTag: SOURCE_TAG, prizePoolAddress: POOL },
  });
}

describe("routes de signature Xaman", () => {
  it("buy-in: 201 et injecte le sourceTag + la destination CÔTÉ SERVEUR", async () => {
    const api = new FakeApi(PAYLOAD);
    const res = await withSign(api).inject({
      method: "POST",
      url: "/sign/buy-in",
      payload: { account: ACCOUNT, amount: "10000000", competitionId: "cup" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      uuid: "u-1",
      signUrl: "https://xumm.app/sign/u-1",
      qrPng: "https://xumm.app/qr/u-1.png",
    });
    // Le client ne fournit NI le sourceTag NI la destination : ils viennent du serveur.
    expect(api.lastTxjson?.["TransactionType"]).toBe("Payment");
    expect(api.lastTxjson?.["SourceTag"]).toBe(SOURCE_TAG);
    expect(api.lastTxjson?.["Destination"]).toBe(POOL);
    expect(api.lastTxjson?.["Account"]).toBe(ACCOUNT);
  });

  it("buy-in: 400 si le corps est invalide (account manquant)", async () => {
    const res = await withSign(new FakeApi(PAYLOAD)).inject({
      method: "POST",
      url: "/sign/buy-in",
      payload: { amount: "10000000", competitionId: "cup" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("buy-in: 400 si le montant en drops n'est pas entier (rejet du builder)", async () => {
    const api = new FakeApi(PAYLOAD);
    const res = await withSign(api).inject({
      method: "POST",
      url: "/sign/buy-in",
      payload: { account: ACCOUNT, amount: "1.5", competitionId: "cup" },
    });
    expect(res.statusCode).toBe(400);
    expect(api.lastTxjson).toBeUndefined(); // rejeté avant l'appel réseau
  });

  it("buy-in: 502 si Xaman refuse de créer le payload (null)", async () => {
    const res = await withSign(new FakeApi(null)).inject({
      method: "POST",
      url: "/sign/buy-in",
      payload: { account: ACCOUNT, amount: "10000000", competitionId: "cup" },
    });
    expect(res.statusCode).toBe(502);
  });

  it("buy-in: 502 si la réponse Xaman est partielle (qr_png manquant)", async () => {
    // Réponse réseau non-null mais incomplète -> XamanError -> 502 (masqué).
    const partial = {
      uuid: "u-x",
      next: { always: "https://xumm.app/sign/u-x" },
      refs: {},
    } as XamanCreatedPayload;
    const res = await withSign(new FakeApi(partial)).inject({
      method: "POST",
      url: "/sign/buy-in",
      payload: { account: ACCOUNT, amount: "10000000", competitionId: "cup" },
    });
    expect(res.statusCode).toBe(502);
    // Le détail de l'erreur amont ne fuite pas au client.
    expect(res.json()).toEqual({ error: "Service amont indisponible" });
  });

  it("live-offer: 400 si l'offre est triviale (gives == wants, rejet du builder)", async () => {
    const api = new FakeApi(PAYLOAD);
    const res = await withSign(api).inject({
      method: "POST",
      url: "/sign/live-offer",
      payload: { account: ACCOUNT, gives: "10000000", wants: "10000000" },
    });
    expect(res.statusCode).toBe(400);
    expect(api.lastTxjson).toBeUndefined(); // rejeté avant l'appel réseau
  });

  it("live-offer: 400 si le corps est invalide (account manquant)", async () => {
    const res = await withSign(new FakeApi(PAYLOAD)).inject({
      method: "POST",
      url: "/sign/live-offer",
      payload: { gives: "10000000", wants: "5000000" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("live-offer: 502 si Xaman refuse (null)", async () => {
    const res = await withSign(new FakeApi(null)).inject({
      method: "POST",
      url: "/sign/live-offer",
      payload: { account: ACCOUNT, gives: "10000000", wants: "5000000" },
    });
    expect(res.statusCode).toBe(502);
  });

  it("live-offer: 201, accepte un montant IOU objet et taggue le swap", async () => {
    const api = new FakeApi(PAYLOAD);
    const res = await withSign(api).inject({
      method: "POST",
      url: "/sign/live-offer",
      payload: {
        account: ACCOUNT,
        gives: "10000000",
        wants: { currency: "USD", issuer: ISSUER, value: "5" },
      },
    });
    expect(res.statusCode).toBe(201);
    expect(api.lastTxjson?.["TransactionType"]).toBe("OfferCreate");
    expect(api.lastTxjson?.["SourceTag"]).toBe(SOURCE_TAG);
  });

  it("sans config de signature, les routes /sign/* sont absentes (404)", async () => {
    const res = await buildServer(baseDeps()).inject({
      method: "POST",
      url: "/sign/buy-in",
      payload: { account: ACCOUNT, amount: "10000000", competitionId: "cup" },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("route métriques d'attribution", () => {
  const METRICS: AttributionMetrics = {
    totalVolume: 1234,
    activeAccounts: 7,
    txCount: 9,
  };

  class FakeStore implements MetricsReader {
    lastTag: number | undefined;
    metrics(sourceTag: number): AttributionMetrics {
      this.lastTag = sourceTag;
      return METRICS;
    }
  }

  it("expose les métriques pour le sourceTag configuré (200)", async () => {
    const store = new FakeStore();
    const app = buildServer({
      ...baseDeps(),
      metrics: { store, sourceTag: SOURCE_TAG },
    });
    const res = await app.inject({ method: "GET", url: "/metrics" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(METRICS);
    expect(store.lastTag).toBe(SOURCE_TAG);
  });

  it("sans indexeur câblé, /metrics est absent (404)", async () => {
    const res = await buildServer(baseDeps()).inject({
      method: "GET",
      url: "/metrics",
    });
    expect(res.statusCode).toBe(404);
  });
});
