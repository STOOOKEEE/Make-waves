import { describe, it, expect } from "vitest";
import { Wallet } from "xrpl";
import { buildSignerListSet } from "../src/tx/multisig";
import { InvalidAddressError, InvalidSignerListError } from "../src/errors";

const ACCOUNT = Wallet.generate().classicAddress;
const S1 = Wallet.generate().classicAddress;
const S2 = Wallet.generate().classicAddress;
const S3 = Wallet.generate().classicAddress;

describe("buildSignerListSet", () => {
  it("construit une SignerListSet valide", () => {
    const tx = buildSignerListSet({
      account: ACCOUNT,
      quorum: 2,
      signers: [
        { account: S1, weight: 1 },
        { account: S2, weight: 1 },
        { account: S3, weight: 1 },
      ],
    });
    expect(tx.TransactionType).toBe("SignerListSet");
    expect(tx.Account).toBe(ACCOUNT);
    expect(tx.SignerQuorum).toBe(2);
    expect(tx.SignerEntries).toEqual([
      { SignerEntry: { Account: S1, SignerWeight: 1 } },
      { SignerEntry: { Account: S2, SignerWeight: 1 } },
      { SignerEntry: { Account: S3, SignerWeight: 1 } },
    ]);
  });

  it("rejette un quorum inatteignable (> somme des poids)", () => {
    expect(() =>
      buildSignerListSet({ account: ACCOUNT, quorum: 5, signers: [{ account: S1, weight: 2 }] }),
    ).toThrow(InvalidSignerListError);
  });

  it("rejette un quorum ≤ 0", () => {
    expect(() =>
      buildSignerListSet({ account: ACCOUNT, quorum: 0, signers: [{ account: S1, weight: 1 }] }),
    ).toThrow(InvalidSignerListError);
  });

  it("rejette zéro signataire", () => {
    expect(() =>
      buildSignerListSet({ account: ACCOUNT, quorum: 1, signers: [] }),
    ).toThrow(InvalidSignerListError);
  });

  it("rejette un signataire en double", () => {
    expect(() =>
      buildSignerListSet({
        account: ACCOUNT,
        quorum: 1,
        signers: [{ account: S1, weight: 1 }, { account: S1, weight: 1 }],
      }),
    ).toThrow(InvalidSignerListError);
  });

  it("rejette le compte lui-même comme signataire", () => {
    expect(() =>
      buildSignerListSet({ account: ACCOUNT, quorum: 1, signers: [{ account: ACCOUNT, weight: 1 }] }),
    ).toThrow(InvalidSignerListError);
  });

  it("rejette un poids invalide", () => {
    expect(() =>
      buildSignerListSet({ account: ACCOUNT, quorum: 1, signers: [{ account: S1, weight: 0 }] }),
    ).toThrow(InvalidSignerListError);
  });

  it("rejette une adresse invalide", () => {
    expect(() =>
      buildSignerListSet({ account: "nope", quorum: 1, signers: [{ account: S1, weight: 1 }] }),
    ).toThrow(InvalidAddressError);
  });
});
