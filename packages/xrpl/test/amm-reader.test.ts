import { describe, it, expect } from "vitest";
import { readAmmSpotPrice } from "../src/price/amm-reader";
import type {
  AmmInfoClient,
  AmmInfoResult,
  XrplCurrency,
} from "../src/price/amm-reader";
import { InvalidAmountError, InvalidPriceError } from "../src/errors";
import type { Amount } from "xrpl";

const ISSUER = "ra6hLorXqVpwb7jWfekgjPcPFRHrQqANZg";
const XRP: XrplCurrency = { currency: "XRP" };
const USD: XrplCurrency = { currency: "USD", issuer: ISSUER };
const EUR: XrplCurrency = { currency: "EUR", issuer: ISSUER };

const XRP_1000_DROPS = "1000000000";
function usd(value: string): Amount {
  return { currency: "USD", issuer: ISSUER, value };
}
function eur(value: string): Amount {
  return { currency: "EUR", issuer: ISSUER, value };
}

function clientReturning(result: AmmInfoResult): {
  client: AmmInfoClient;
  calls: unknown[];
} {
  const calls: unknown[] = [];
  const client: AmmInfoClient = {
    request: (request) => {
      calls.push(request);
      return Promise.resolve(result);
    },
  };
  return { client, calls };
}

function pool(amount: Amount, amount2: Amount): AmmInfoResult {
  return { result: { amm: { amount, amount2 } } };
}

describe("readAmmSpotPrice", () => {
  it("calcule le prix d'asset en asset2 (ordre réponse = ordre requête)", async () => {
    // pool 1000 XRP <-> 500 USD -> 1 XRP = 0.5 USD
    const { client } = clientReturning(pool(XRP_1000_DROPS, usd("500")));
    expect(await readAmmSpotPrice(client, XRP, USD)).toBe(0.5);
  });

  it("reste correct quand le serveur renvoie les réserves dans l'ordre INVERSE", async () => {
    // Le protocole renvoie un ordre canonique != ordre de la requête : ici
    // amount = USD, amount2 = XRP, mais on demande le prix de XRP en USD.
    const { client } = clientReturning(pool(usd("500"), XRP_1000_DROPS));
    expect(await readAmmSpotPrice(client, XRP, USD)).toBe(0.5);
  });

  it("gère une paire token/token dans les deux ordres", async () => {
    // 1000 USD <-> 500 EUR -> 1 USD = 0.5 EUR
    const direct = clientReturning(pool(usd("1000"), eur("500")));
    expect(await readAmmSpotPrice(direct.client, USD, EUR)).toBe(0.5);
    const inverse = clientReturning(pool(eur("500"), usd("1000")));
    expect(await readAmmSpotPrice(inverse.client, USD, EUR)).toBe(0.5);
  });

  it("transmet asset et asset2 dans la requête amm_info", async () => {
    const { client, calls } = clientReturning(pool(XRP_1000_DROPS, usd("500")));
    await readAmmSpotPrice(client, XRP, USD);
    expect(calls[0]).toEqual({ command: "amm_info", asset: XRP, asset2: USD });
  });

  it("lève si le pool est absent de la réponse", async () => {
    const { client } = clientReturning({ result: {} });
    await expect(readAmmSpotPrice(client, XRP, USD)).rejects.toThrow(
      InvalidPriceError,
    );
  });

  it("lève si aucune réserve ne correspond à asset", async () => {
    const { client } = clientReturning(pool(usd("500"), eur("500")));
    await expect(readAmmSpotPrice(client, XRP, USD)).rejects.toThrow(
      InvalidPriceError,
    );
  });

  it("propage l'erreur de validation si une réserve est invalide", async () => {
    const { client } = clientReturning(pool("0", usd("500")));
    await expect(readAmmSpotPrice(client, XRP, USD)).rejects.toThrow(
      InvalidAmountError,
    );
  });
});
