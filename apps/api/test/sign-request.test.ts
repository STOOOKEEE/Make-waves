import { describe, it, expect } from "vitest";
import { InvalidAddressError } from "@tide/xrpl";
import {
  createBuyInSignRequest,
  createLiveOfferSignRequest,
  createSignRequest,
  XamanError,
} from "../src/xaman/sign-request";
import type {
  XamanCreatedPayload,
  XamanPayloadApi,
} from "../src/xaman/sign-request";

// Adresses XRPL valides (générées via xrpl.js, figées pour des tests stables ;
// apps/api ne dépend pas directement d'xrpl).
const ACCOUNT = "rPh1pu5PSEPBv45NWPYTN7gUEMmaGNePGY";
const POOL = "r3ZrdNvM99kxJjtYXL7twctbexdeCyD9hp";
const ISSUER = "rBHYF7U1FLhG9ZWcyhRL9Rytrvx5ARBAUK";
const TAG = 7777;

const PAYLOAD: XamanCreatedPayload = {
  uuid: "u-1",
  next: { always: "https://xumm.app/sign/u-1" },
  refs: { qr_png: "https://xumm.app/qr/u-1.png" },
};

class FakeApi implements XamanPayloadApi {
  lastTxjson: object | undefined;
  constructor(private readonly result: XamanCreatedPayload | null) {}
  async create(payload: { txjson: object }): Promise<XamanCreatedPayload | null> {
    this.lastTxjson = payload.txjson;
    return this.result;
  }
}

describe("createSignRequest", () => {
  it("mappe la réponse XUMM vers SignRequest", async () => {
    const req = await createSignRequest(new FakeApi(PAYLOAD), { TransactionType: "Payment" });
    expect(req).toEqual({
      uuid: "u-1",
      signUrl: "https://xumm.app/sign/u-1",
      qrPng: "https://xumm.app/qr/u-1.png",
    });
  });

  it("lève XamanError si XUMM refuse (null)", async () => {
    await expect(
      createSignRequest(new FakeApi(null), { TransactionType: "Payment" }),
    ).rejects.toBeInstanceOf(XamanError);
  });

  it("lève XamanError si la réponse XUMM est partielle (next/refs manquants)", async () => {
    const partial = { uuid: "u-1" } as XamanCreatedPayload; // simule une réponse réseau malformée
    await expect(
      createSignRequest(new FakeApi(partial), { TransactionType: "Payment" }),
    ).rejects.toBeInstanceOf(XamanError);
  });
});

describe("createBuyInSignRequest", () => {
  it("construit le buy-in taggé et le passe à Xaman", async () => {
    const api = new FakeApi(PAYLOAD);
    const req = await createBuyInSignRequest(api, {
      account: ACCOUNT,
      destination: POOL,
      amount: "10000000",
      sourceTag: TAG,
      competitionId: "cup",
    });
    expect(req.uuid).toBe("u-1");
    // La tx envoyée à Xaman est bien le Payment taggé.
    const sent = api.lastTxjson as { TransactionType: string; SourceTag: number };
    expect(sent.TransactionType).toBe("Payment");
    expect(sent.SourceTag).toBe(TAG);
  });

  it("propage l'erreur du builder (adresse invalide) avant tout appel réseau", async () => {
    const api = new FakeApi(PAYLOAD);
    await expect(
      createBuyInSignRequest(api, {
        account: "nope",
        destination: POOL,
        amount: "10000000",
        sourceTag: TAG,
        competitionId: "cup",
      }),
    ).rejects.toBeInstanceOf(InvalidAddressError);
    expect(api.lastTxjson).toBeUndefined();
  });
});

describe("createLiveOfferSignRequest", () => {
  it("construit le swap taggé et le passe à Xaman", async () => {
    const api = new FakeApi(PAYLOAD);
    const req = await createLiveOfferSignRequest(api, {
      account: ACCOUNT,
      gives: "10000000",
      wants: { currency: "USD", issuer: ISSUER, value: "5" },
      sourceTag: TAG,
    });
    expect(req.signUrl).toBe("https://xumm.app/sign/u-1");
    const sent = api.lastTxjson as { TransactionType: string };
    expect(sent.TransactionType).toBe("OfferCreate");
  });
});
