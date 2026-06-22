import { describe, it, expect } from "vitest";
import { XrplClient } from "../src/client/xrpl-client";
import { XrplConnectionError, XrplRequestError } from "../src/client/errors";
import { InvalidAmountError, InvalidPriceError } from "../src/errors";
import type {
  XrplConnection,
  XrplRequestEnvelope,
  XrplResponseEnvelope,
} from "../src/client/connection";

// Adresse XRPL valide (compte genesis) pour les fixtures d'issuer.
const ISSUER = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

type Responder = (request: XrplRequestEnvelope) => XrplResponseEnvelope;

class FakeConnection implements XrplConnection {
  connected = false;
  connectCalls = 0;
  disconnectCalls = 0;
  private readonly responder: Responder;
  private readonly failConnect: boolean;

  constructor(responder: Responder, options: { failConnect?: boolean } = {}) {
    this.responder = responder;
    this.failConnect = options.failConnect ?? false;
  }

  async connect(): Promise<void> {
    this.connectCalls += 1;
    if (this.failConnect) {
      throw new Error("websocket down");
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.disconnectCalls += 1;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async request(request: XrplRequestEnvelope): Promise<XrplResponseEnvelope> {
    return this.responder(request);
  }
}

const ammPool: XrplResponseEnvelope = {
  result: {
    amm: {
      amount: "1000000000", // 1000 XRP (drops)
      amount2: { currency: "USD", issuer: ISSUER, value: "500" },
    },
  },
};

describe("XrplClient.ammSpotPrice", () => {
  it("lit amm_info et calcule le prix spot (quote/base)", async () => {
    const conn = new FakeConnection(() => ammPool);
    const client = new XrplClient(conn);

    const price = await client.ammSpotPrice(
      { currency: "XRP" },
      { currency: "USD", issuer: ISSUER },
    );

    // 500 USD / 1000 XRP = 0.5 USD par XRP
    expect(price).toBe(0.5);
    expect(conn.isConnected()).toBe(true);
    expect(conn.connectCalls).toBe(1);
  });

  it("se connecte automatiquement avant la lecture", async () => {
    const conn = new FakeConnection(() => ammPool);
    expect(conn.isConnected()).toBe(false);
    await new XrplClient(conn).ammSpotPrice(
      { currency: "XRP" },
      { currency: "USD", issuer: ISSUER },
    );
    expect(conn.connectCalls).toBe(1);
  });

  it("ne reconnecte pas si déjà connecté (idempotent)", async () => {
    const conn = new FakeConnection(() => ammPool);
    conn.connected = true;
    await new XrplClient(conn).ammSpotPrice(
      { currency: "XRP" },
      { currency: "USD", issuer: ISSUER },
    );
    expect(conn.connectCalls).toBe(0);
  });

  it("lève InvalidPriceError si le pool est absent", async () => {
    const conn = new FakeConnection(() => ({ result: {} }));
    await expect(
      new XrplClient(conn).ammSpotPrice(
        { currency: "XRP" },
        { currency: "USD", issuer: ISSUER },
      ),
    ).rejects.toBeInstanceOf(InvalidPriceError);
  });

  it("lève XrplRequestError si les réserves sont malformées", async () => {
    const conn = new FakeConnection(() => ({
      result: { amm: { amount: "1000000000" } }, // amount2 manquant
    }));
    await expect(
      new XrplClient(conn).ammSpotPrice(
        { currency: "XRP" },
        { currency: "USD", issuer: ISSUER },
      ),
    ).rejects.toBeInstanceOf(XrplRequestError);
  });

  it("type l'échec de connexion en XrplConnectionError", async () => {
    const conn = new FakeConnection(() => ammPool, { failConnect: true });
    await expect(
      new XrplClient(conn).ammSpotPrice(
        { currency: "XRP" },
        { currency: "USD", issuer: ISSUER },
      ),
    ).rejects.toBeInstanceOf(XrplConnectionError);
  });

  it("type une panne réseau de requête (post-connexion) en XrplConnectionError", async () => {
    const conn = new FakeConnection(() => {
      throw new Error("websocket closed mid-request");
    });
    await expect(
      new XrplClient(conn).ammSpotPrice(
        { currency: "XRP" },
        { currency: "USD", issuer: ISSUER },
      ),
    ).rejects.toBeInstanceOf(XrplConnectionError);
  });

  it("lève XrplRequestError si le result est null (réponse non-objet)", async () => {
    const conn = new FakeConnection(() => ({ result: null }));
    await expect(
      new XrplClient(conn).ammSpotPrice(
        { currency: "XRP" },
        { currency: "USD", issuer: ISSUER },
      ),
    ).rejects.toBeInstanceOf(XrplRequestError);
  });

  it("traite amm null comme pool absent (InvalidPriceError, pas malformé)", async () => {
    const conn = new FakeConnection(() => ({ result: { amm: null } }));
    await expect(
      new XrplClient(conn).ammSpotPrice(
        { currency: "XRP" },
        { currency: "USD", issuer: ISSUER },
      ),
    ).rejects.toBeInstanceOf(InvalidPriceError);
  });

  it("rejette une réserve string non-numérique en InvalidAmountError", async () => {
    const conn = new FakeConnection(() => ({
      result: {
        amm: {
          amount: "not-a-number",
          amount2: { currency: "USD", issuer: ISSUER, value: "500" },
        },
      },
    }));
    await expect(
      new XrplClient(conn).ammSpotPrice(
        { currency: "XRP" },
        { currency: "USD", issuer: ISSUER },
      ),
    ).rejects.toBeInstanceOf(InvalidAmountError);
  });
});

describe("XrplClient lifecycle", () => {
  it("connect/disconnect basculent l'état et sont idempotents", async () => {
    const conn = new FakeConnection(() => ammPool);
    const client = new XrplClient(conn);

    await client.connect();
    await client.connect(); // idempotent
    expect(conn.connectCalls).toBe(1);
    expect(client.isConnected()).toBe(true);

    await client.disconnect();
    await client.disconnect(); // idempotent
    expect(conn.disconnectCalls).toBe(1);
    expect(client.isConnected()).toBe(false);
  });

  it("ne connecte qu'une fois sous appels concurrents", async () => {
    const conn = new FakeConnection(() => ammPool);
    const client = new XrplClient(conn);

    await Promise.all([client.connect(), client.connect(), client.connect()]);

    expect(conn.connectCalls).toBe(1);
    expect(client.isConnected()).toBe(true);
  });
});
