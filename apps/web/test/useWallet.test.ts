// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthTokenDto, PayloadStatus, TideClient } from "@tide/client";
import {
  acceptNFTOffer,
  getAddress,
  getPublicKey,
  isInstalled,
  signMessage,
} from "@gemwallet/api";
import type { ResponseType } from "@gemwallet/api/_constants";
import { useSession } from "../src/composables/useSession";
import { useWallet } from "../src/composables/useWallet";

vi.mock("@gemwallet/api", () => ({
  acceptNFTOffer: vi.fn(),
  getAddress: vi.fn(),
  getPublicKey: vi.fn(),
  isInstalled: vi.fn(),
  signMessage: vi.fn(),
  submitTransaction: vi.fn(),
}));

const ACCOUNT = "rAgentWallet111111111111111111111111111";
const POLL_MS = 2500;
const GEM_RESPONSE = "response" as ResponseType;

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function fakeClient(authResult: Promise<AuthTokenDto>): TideClient {
  const status: PayloadStatus = {
    resolved: true,
    signed: true,
    account: ACCOUNT,
    txid: null,
  };
  return {
    connectWallet: vi.fn().mockResolvedValue({
      uuid: "xaman-payload",
      signUrl: "https://xaman.example/sign",
      qrPng: "data:image/png;base64,AA==",
    }),
    signStatus: vi.fn().mockResolvedValue(status),
    authVerifyXaman: vi.fn().mockReturnValue(authResult),
    setToken: vi.fn(),
  } as unknown as TideClient;
}

function fakeGemClient(authResult: Promise<AuthTokenDto>): TideClient {
  return {
    authChallenge: vi.fn().mockResolvedValue({ nonce: "nonce", message: "challenge" }),
    authVerifyGem: vi.fn().mockReturnValue(authResult),
    setToken: vi.fn(),
  } as unknown as TideClient;
}

async function reachGemVerification(): Promise<void> {
  for (let turn = 0; turn < 12; turn += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  localStorage.clear();
  useSession().disconnectWallet();
  vi.mocked(isInstalled).mockResolvedValue({ result: { isInstalled: true } });
  vi.mocked(getAddress).mockResolvedValue({
    type: GEM_RESPONSE,
    result: { address: ACCOUNT },
  });
  vi.mocked(signMessage).mockResolvedValue({
    type: GEM_RESPONSE,
    result: { signedMessage: "gem-signature" },
  });
  vi.mocked(getPublicKey).mockResolvedValue({
    type: GEM_RESPONSE,
    result: { address: ACCOUNT, publicKey: "gem-public-key" },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useWallet — connexion Xaman", () => {
  it("n'expose le wallet qu'après la réussite de l'authentification JWT", async () => {
    const auth = deferred<AuthTokenDto>();
    const wallet = useWallet(fakeClient(auth.promise));
    wallet.close();

    await wallet.chooseXaman();
    expect(wallet.phase.value).toBe("pending");
    expect(useSession().walletConnected.value).toBe(false);

    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(useSession().walletConnected.value).toBe(false);
    expect(wallet.phase.value).toBe("pending");

    auth.resolve({ token: "wallet-jwt", address: ACCOUNT });
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    expect(useSession().liveAddress.value).toBe(ACCOUNT);
    expect(useSession().walletType.value).toBe("xaman");
    expect(wallet.phase.value).toBe("signed");
    expect(localStorage.getItem("tide.sessionToken")).toBe("wallet-jwt");
    wallet.close();
  });

  it("ne persiste aucune adresse si l'authentification Xaman échoue", async () => {
    const auth = deferred<AuthTokenDto>();
    const wallet = useWallet(fakeClient(auth.promise));
    wallet.close();

    await wallet.chooseXaman();
    await vi.advanceTimersByTimeAsync(POLL_MS);
    auth.reject(new Error("auth refusée"));
    await vi.advanceTimersByTimeAsync(0);

    expect(useSession().walletConnected.value).toBe(false);
    expect(localStorage.getItem("tide.liveAddress")).toBeNull();
    expect(wallet.phase.value).toBe("error");
    expect(wallet.error.value).toBe("Network error");
    wallet.close();
  });

  it("ignore une authentification Xaman qui se termine après la fermeture", async () => {
    const auth = deferred<AuthTokenDto>();
    const client = fakeClient(auth.promise);
    const wallet = useWallet(client);
    wallet.close();

    await wallet.chooseXaman();
    await vi.advanceTimersByTimeAsync(POLL_MS);
    wallet.close();
    auth.resolve({ token: "stale-wallet-jwt", address: ACCOUNT });
    await Promise.resolve();
    await Promise.resolve();

    expect(wallet.phase.value).toBe("idle");
    expect(useSession().walletConnected.value).toBe(false);
    expect(localStorage.getItem("tide.sessionToken")).toBeNull();
    expect(client.setToken).not.toHaveBeenCalledWith("stale-wallet-jwt");
  });

  it("la dernière connexion Xaman gagne si deux flux se chevauchent", async () => {
    const firstAuth = deferred<AuthTokenDto>();
    const secondAuth = deferred<AuthTokenDto>();
    const secondAccount = "rSecondWallet22222222222222222222222222";
    const client = {
      connectWallet: vi
        .fn()
        .mockResolvedValueOnce({
          uuid: "xaman-first",
          signUrl: "https://xaman.example/first",
          qrPng: "data:image/png;base64,AA==",
        })
        .mockResolvedValueOnce({
          uuid: "xaman-second",
          signUrl: "https://xaman.example/second",
          qrPng: "data:image/png;base64,AA==",
        }),
      signStatus: vi.fn((uuid: string) =>
        Promise.resolve({
          resolved: true,
          signed: true,
          account: uuid === "xaman-first" ? ACCOUNT : secondAccount,
          txid: null,
        } satisfies PayloadStatus),
      ),
      authVerifyXaman: vi.fn((uuid: string) =>
        uuid === "xaman-first" ? firstAuth.promise : secondAuth.promise,
      ),
      setToken: vi.fn(),
    } as unknown as TideClient;
    const wallet = useWallet(client);
    wallet.close();

    await wallet.chooseXaman();
    await vi.advanceTimersByTimeAsync(POLL_MS);
    await wallet.chooseXaman();
    await vi.advanceTimersByTimeAsync(POLL_MS);

    secondAuth.resolve({ token: "second-jwt", address: secondAccount });
    await Promise.resolve();
    await Promise.resolve();
    firstAuth.resolve({ token: "first-jwt", address: ACCOUNT });
    await Promise.resolve();
    await Promise.resolve();

    expect(useSession().liveAddress.value).toBe(secondAccount);
    expect(localStorage.getItem("tide.sessionToken")).toBe("second-jwt");
    expect(client.setToken).not.toHaveBeenCalledWith("first-jwt");
    expect(wallet.phase.value).toBe("signed");
    wallet.close();
  });
});

describe("useWallet — claim NFT GemWallet", () => {
  it("reprend l'offre via le flux NFT dédié en conservant le SourceTag", async () => {
    useSession().setWallet(ACCOUNT, "gem");
    vi.mocked(acceptNFTOffer).mockResolvedValue({
      type: GEM_RESPONSE,
      result: { hash: "ACCEPT_HASH" },
    });
    const wallet = useWallet(fakeGemClient(Promise.resolve({
      token: "wallet-jwt",
      address: ACCOUNT,
    })));

    const hash = await wallet.signBadgeAccept(
      {
        TransactionType: "NFTokenAcceptOffer",
        Account: ACCOUNT,
        NFTokenSellOffer: "A".repeat(64),
        SourceTag: 2606210009,
      },
      { userId: ACCOUNT, code: "first_trade", walletAddress: ACCOUNT },
    );

    expect(acceptNFTOffer).toHaveBeenCalledWith({
      NFTokenSellOffer: "A".repeat(64),
      sourceTag: 2606210009,
    });
    expect(hash).toBe("ACCEPT_HASH");
    expect(wallet.phase.value).toBe("signed");
    wallet.close();
  });

  it("affiche le message réel renvoyé par l'extension", async () => {
    useSession().setWallet(ACCOUNT, "gem");
    vi.mocked(acceptNFTOffer).mockRejectedValue({
      message: "GemWallet mainnet indisponible",
    });
    const wallet = useWallet(fakeGemClient(Promise.resolve({
      token: "wallet-jwt",
      address: ACCOUNT,
    })));

    const hash = await wallet.signBadgeAccept(
      {
        TransactionType: "NFTokenAcceptOffer",
        Account: ACCOUNT,
        NFTokenSellOffer: "B".repeat(64),
        SourceTag: 2606210009,
      },
      { userId: ACCOUNT, code: "first_trade", walletAddress: ACCOUNT },
    );

    expect(hash).toBeNull();
    expect(wallet.error.value).toBe("GemWallet mainnet indisponible");
    wallet.close();
  });

  it("refuse avant soumission si GemWallet a changé de compte actif", async () => {
    useSession().setWallet(ACCOUNT, "gem");
    vi.mocked(getAddress).mockResolvedValueOnce({
      type: GEM_RESPONSE,
      result: { address: "rOtherWallet222222222222222222222222222" },
    });
    const wallet = useWallet(fakeGemClient(Promise.resolve({
      token: "wallet-jwt",
      address: ACCOUNT,
    })));

    const hash = await wallet.signBadgeAccept(
      {
        TransactionType: "NFTokenAcceptOffer",
        Account: ACCOUNT,
        NFTokenSellOffer: "C".repeat(64),
        SourceTag: 2606210009,
      },
      { userId: ACCOUNT, code: "first_trade", walletAddress: ACCOUNT },
    );

    expect(hash).toBeNull();
    expect(acceptNFTOffer).not.toHaveBeenCalled();
    expect(wallet.error.value).toContain("Sélectionne le compte rAgent…1111");
    wallet.close();
  });
});

describe("useWallet — connexion GemWallet", () => {
  it("n'expose le wallet qu'après la vérification du challenge", async () => {
    const auth = deferred<AuthTokenDto>();
    const client = fakeGemClient(auth.promise);
    const wallet = useWallet(client);
    wallet.close();

    const choosing = wallet.chooseGem();
    await reachGemVerification();
    expect(client.authVerifyGem).toHaveBeenCalledOnce();
    expect(useSession().walletConnected.value).toBe(false);

    auth.resolve({ token: "gem-jwt", address: ACCOUNT });
    await choosing;

    expect(useSession().liveAddress.value).toBe(ACCOUNT);
    expect(useSession().walletType.value).toBe("gem");
    expect(localStorage.getItem("tide.sessionToken")).toBe("gem-jwt");
    expect(wallet.phase.value).toBe("signed");
    wallet.close();
  });

  it("ignore une vérification GemWallet terminée après fermeture", async () => {
    const auth = deferred<AuthTokenDto>();
    const client = fakeGemClient(auth.promise);
    const wallet = useWallet(client);
    wallet.close();

    const choosing = wallet.chooseGem();
    await reachGemVerification();
    expect(client.authVerifyGem).toHaveBeenCalledOnce();
    wallet.close();
    auth.resolve({ token: "stale-gem-jwt", address: ACCOUNT });
    await choosing;

    expect(wallet.phase.value).toBe("idle");
    expect(useSession().walletConnected.value).toBe(false);
    expect(localStorage.getItem("tide.sessionToken")).toBeNull();
    expect(client.setToken).not.toHaveBeenCalledWith("stale-gem-jwt");
  });
});
