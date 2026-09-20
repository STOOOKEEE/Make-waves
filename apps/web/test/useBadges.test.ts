import { describe, it, expect } from "vitest";
import { useBadges, type BadgeClient } from "../src/composables/useBadges";
import type { BadgeDto } from "@tide/client";

const BADGE: BadgeDto = {
  code: "first_trade",
  title: "First Trade",
  description: "d",
  imageUrl: "/badges/first_trade.svg",
  earned: true,
  status: "unclaimed",
  nftTokenId: null,
  claimMode: "external_wallet",
};

function fakeClient(overrides: Partial<BadgeClient> = {}): {
  client: BadgeClient;
  calls: string[];
} {
  const calls: string[] = [];
  const client: BadgeClient = {
    async badges() {
      calls.push("badges");
      return [BADGE];
    },
    async claimBadge() {
      calls.push("claimBadge");
      return {
        sellOfferId: "OFF1",
        nftTokenId: "NFT1",
        acceptTx: {
          TransactionType: "NFTokenAcceptOffer" as const,
          Account: "rWallet",
          NFTokenSellOffer: "OFF1",
          SourceTag: 2606210009,
        },
      };
    },
    async confirmBadgeClaim() {
      calls.push("confirmBadgeClaim");
    },
    ...overrides,
  };
  return { client, calls };
}

describe("useBadges", () => {
  it("load remplit badges", async () => {
    const { client } = fakeClient();
    const b = useBadges(client);
    await b.load("u1");
    expect(b.badges.value).toHaveLength(1);
    expect(b.badges.value[0]?.code).toBe("first_trade");
  });

  it("load ignore un userId vide", async () => {
    const { client, calls } = fakeClient();
    const b = useBadges(client);
    await b.load("");
    expect(calls).not.toContain("badges");
  });

  it("claim enchaîne claimBadge → sign → confirm → reload", async () => {
    const { client, calls } = fakeClient();
    const b = useBadges(client);
    let signedOffer = "";
    await b.claim("u1", "first_trade", "rWallet", async ({ acceptTx }) => {
      signedOffer = acceptTx.NFTokenSellOffer;
      return "HASH";
    });
    expect(signedOffer).toBe("OFF1");
    expect(calls).toEqual(["claimBadge", "confirmBadgeClaim", "badges"]);
    expect(b.claiming.value).toBeNull();
  });

  it("claim annulé (sign null) ne confirme pas", async () => {
    const { client, calls } = fakeClient();
    const b = useBadges(client);
    await b.claim("u1", "first_trade", "rWallet", async () => null);
    expect(calls).toEqual(["claimBadge"]);
  });

  it("reprend une offre déjà mintée sans repasser par le mint initial", async () => {
    const { client, calls } = fakeClient({
      async badges() {
        calls.push("badges");
        return [{ ...BADGE, status: "offer_pending" }];
      },
      async resumeBadgeClaim() {
        calls.push("resumeBadgeClaim");
        return {
          sellOfferId: "OFF1",
          nftTokenId: "NFT1",
          acceptTx: {
            TransactionType: "NFTokenAcceptOffer" as const,
            Account: "rWallet",
            NFTokenSellOffer: "OFF1",
            SourceTag: 2606210009,
          },
        };
      },
    });
    const b = useBadges(client);
    await b.load("u1");
    await b.claim("u1", "first_trade", "rWallet", async () => "HASH");
    expect(calls).toEqual([
      "badges",
      "resumeBadgeClaim",
      "confirmBadgeClaim",
      "badges",
    ]);
  });
});
