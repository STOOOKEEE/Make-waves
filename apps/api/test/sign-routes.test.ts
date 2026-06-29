import { describe, it, expect } from "vitest";
import type { FastifyInstance } from "fastify";
import type { AttributionMetrics } from "@tide/xrpl";
import { buildServer } from "../src/http/server";
import type { MetricsReader, ServerDeps } from "../src/http/server";
import { PaperService } from "../src/services/paper-service";
import { CompetitionService } from "../src/services/competition-service";
import type {
  PayloadStatus,
  XamanCreatedPayload,
  XamanPayloadApi,
} from "../src/xaman/sign-request";

// Adresses XRPL valides (figées pour des tests stables ; apps/api ne dépend pas
// directement d'xrpl).
const ACCOUNT = "rPh1pu5PSEPBv45NWPYTN7gUEMmaGNePGY";
const POOL = "r3ZrdNvM99kxJjtYXL7twctbexdeCyD9hp";
const ISSUER = "rBHYF7U1FLhG9ZWcyhRL9Rytrvx5ARBAUK";
const SOURCE_TAG = 7777;
const RLUSD = "524C555344000000000000000000000000000000";
const QUOTE = { currency: RLUSD, issuer: ISSUER, symbol: "RLUSD" };
/** Prix de référence du feed (XRP en RLUSD ≈ USD). */
const PRICES = { XRP: 0.5 };

const PAYLOAD: XamanCreatedPayload = {
  uuid: "u-1",
  next: { always: "https://xumm.app/sign/u-1" },
  refs: { qr_png: "https://xumm.app/qr/u-1.png" },
};

/** Faux SDK Xaman : capture la tx envoyée et renvoie une réponse contrôlée. */
class FakeApi implements XamanPayloadApi {
  lastTxjson: Record<string, unknown> | undefined;
  constructor(
    private readonly result: XamanCreatedPayload | null,
    private readonly status: PayloadStatus | null = null,
  ) {}
  async create(payload: {
    txjson: object;
  }): Promise<XamanCreatedPayload | null> {
    this.lastTxjson = payload.txjson as Record<string, unknown>;
    return this.result;
  }
  async get(): Promise<PayloadStatus | null> {
    return this.status;
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

/** Serveur avec signature Xaman ET moteur d'exécution Live (quote + prix réels). */
function withSignExec(api: XamanPayloadApi): FastifyInstance {
  return buildServer({
    ...baseDeps(),
    getPrices: () => PRICES,
    sign: { api, sourceTag: SOURCE_TAG, prizePoolAddress: POOL },
    exec: { sourceTag: SOURCE_TAG, quote: QUOTE },
  });
}

/** Serveur avec le moteur d'exécution SEUL (GemWallet : /exec/plan, pas Xaman). */
function withExecOnly(): FastifyInstance {
  return buildServer({
    ...baseDeps(),
    getPrices: () => PRICES,
    exec: { sourceTag: SOURCE_TAG, quote: QUOTE },
  });
}

/** Intention de swap valide (achat de 100 XRP, slippage 1 %). */
const INTENT = { account: ACCOUNT, base: "XRP", side: "buy", amountBase: 100, slippageTolerance: 0.01 };

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

  it("connect: 201 et crée un payload SignIn (connexion de wallet)", async () => {
    const api = new FakeApi(PAYLOAD);
    const res = await withSign(api).inject({ method: "POST", url: "/sign/connect" });
    expect(res.statusCode).toBe(201);
    expect(res.json().uuid).toBe("u-1");
    expect(api.lastTxjson?.["TransactionType"]).toBe("SignIn");
  });

  it("status: renvoie l'état résolu + l'adresse signataire", async () => {
    const status: PayloadStatus = {
      resolved: true,
      signed: true,
      account: ACCOUNT,
      txid: null,
    };
    const res = await withSign(new FakeApi(PAYLOAD, status)).inject({
      method: "GET",
      url: "/sign/status/u-1",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(status);
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

  it("live-offer: 201, le serveur calcule l'OfferCreate borné et injecte l'attribution", async () => {
    const api = new FakeApi(PAYLOAD);
    const res = await withSignExec(api).inject({
      method: "POST",
      url: "/sign/live-offer",
      payload: INTENT,
    });
    expect(res.statusCode).toBe(201);
    expect(api.lastTxjson?.["TransactionType"]).toBe("OfferCreate");
    expect(api.lastTxjson?.["SourceTag"]).toBe(SOURCE_TAG);
    expect(api.lastTxjson?.["Account"]).toBe(ACCOUNT);
    // Achat de 100 XRP à 0.5 + 1 % de slippage → on FOURNIT au plus 50.5 RLUSD.
    expect(api.lastTxjson?.["TakerGets"]).toEqual({
      currency: RLUSD,
      issuer: ISSUER,
      value: "50.5",
    });
    // … et on REÇOIT 100 XRP (en drops).
    expect(api.lastTxjson?.["TakerPays"]).toBe("100000000");
  });

  it("live-offer: 400 si l'actif n'est pas tradable en Live (LiveExecError)", async () => {
    const api = new FakeApi(PAYLOAD);
    const res = await withSignExec(api).inject({
      method: "POST",
      url: "/sign/live-offer",
      payload: { ...INTENT, base: "DOGE" },
    });
    expect(res.statusCode).toBe(400);
    expect(api.lastTxjson).toBeUndefined(); // rejeté avant l'appel réseau
  });

  it("live-offer: 400 si le slippage est hors borne (rejet du moteur)", async () => {
    const api = new FakeApi(PAYLOAD);
    const res = await withSignExec(api).inject({
      method: "POST",
      url: "/sign/live-offer",
      payload: { ...INTENT, slippageTolerance: 1.5 },
    });
    expect(res.statusCode).toBe(400);
    expect(api.lastTxjson).toBeUndefined();
  });

  it("live-offer: 400 si le corps est invalide (side manquant)", async () => {
    const res = await withSignExec(new FakeApi(PAYLOAD)).inject({
      method: "POST",
      url: "/sign/live-offer",
      payload: { account: ACCOUNT, base: "XRP", amountBase: 100, slippageTolerance: 0.01 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("live-offer: 502 si Xaman refuse (null)", async () => {
    const res = await withSignExec(new FakeApi(null)).inject({
      method: "POST",
      url: "/sign/live-offer",
      payload: INTENT,
    });
    expect(res.statusCode).toBe(502);
  });

  it("exec/plan: 201, renvoie l'OfferCreate taggé (signature côté extension)", async () => {
    const res = await withExecOnly().inject({
      method: "POST",
      url: "/exec/plan",
      payload: INTENT,
    });
    expect(res.statusCode).toBe(201);
    const plan = res.json();
    expect(plan.offer.TransactionType).toBe("OfferCreate");
    expect(plan.offer.SourceTag).toBe(SOURCE_TAG);
    expect(plan.offer.TakerPays).toBe("100000000");
    expect(plan.referencePrice).toBe(0.5);
    expect(plan.limitPrice).toBeCloseTo(0.505);
  });

  it("config: expose le SourceTag aussi quand seul le moteur GemWallet est actif", async () => {
    const res = await withExecOnly().inject({ method: "GET", url: "/config" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ sourceTag: SOURCE_TAG, quoteSymbol: "RLUSD" });
  });

  it("exec/plan: 400 quand le feed ne cote pas la base (LiveExecError)", async () => {
    const noPrice = buildServer({
      ...baseDeps(),
      getPrices: () => ({}),
      exec: { sourceTag: SOURCE_TAG, quote: QUOTE },
    });
    const res = await noPrice.inject({ method: "POST", url: "/exec/plan", payload: INTENT });
    expect(res.statusCode).toBe(400);
  });

  it("sans moteur d'exécution, /sign/live-offer et /exec/plan sont absents (404)", async () => {
    const onlyXaman = withSign(new FakeApi(PAYLOAD));
    const a = await onlyXaman.inject({ method: "POST", url: "/sign/live-offer", payload: INTENT });
    expect(a.statusCode).toBe(404); // Xaman seul, pas de quote → live-offer non monté
    const b = await buildServer(baseDeps()).inject({ method: "POST", url: "/exec/plan", payload: INTENT });
    expect(b.statusCode).toBe(404);
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
