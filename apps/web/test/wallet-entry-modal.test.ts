// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TideClient } from "@tide/client";
import WalletEntryModal from "../src/components/WalletEntryModal.vue";
import { useSession } from "../src/composables/useSession";
import { useWallet } from "../src/composables/useWallet";
import { useWalletEntry } from "../src/composables/useWalletEntry";

function fakeClient(): TideClient & {
  authPaper: ReturnType<typeof vi.fn>;
  claimPaperWallet: ReturnType<typeof vi.fn>;
} {
  return {
    authPaper: vi.fn().mockResolvedValue({
      token: "paper-token",
      userId: "paper:modal-test",
    }),
    claimPaperWallet: vi.fn().mockResolvedValue({
      network: "mainnet",
      walletAddress: "rWallet",
      walletStatus: "funded",
      fundingTxHash: "FUND",
      walletDeleteTxHash: null,
      rewardWalletAddress: null,
      rewardWalletStatus: "not_created",
      rewardFundingTxHash: null,
      rewardFundingSourceAddress: null,
      rewardStatus: "not_earned",
      nftTokenId: null,
      claimTxHash: null,
    }),
    setToken: vi.fn(),
  } as unknown as TideClient & {
    authPaper: ReturnType<typeof vi.fn>;
    claimPaperWallet: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => {
  localStorage.clear();
  useSession().disconnectWallet();
  useWalletEntry().close();
});

describe("WalletEntryModal", () => {
  it("crée le wallet Paper depuis le point d'entrée central", async () => {
    const client = fakeClient();
    const entry = useWalletEntry();
    entry.show();
    const wrapper = mount(WalletEntryModal, { props: { client } });

    await wrapper.find(".paper-option").trigger("click");
    await flushPromises();

    expect(client.authPaper).toHaveBeenCalledOnce();
    expect(client.claimPaperWallet).toHaveBeenCalledWith("paper:modal-test");
    expect(entry.open.value).toBe(false);
    wrapper.unmount();
  });

  it("prépare la session Paper avant d'ouvrir le choix Xaman/GemWallet", async () => {
    const client = fakeClient();
    const entry = useWalletEntry();
    const wallet = useWallet(client);
    wallet.close();
    entry.show();
    const wrapper = mount(WalletEntryModal, { props: { client } });

    await wrapper.find(".external-option").trigger("click");
    await flushPromises();

    expect(client.authPaper).toHaveBeenCalledOnce();
    expect(wallet.phase.value).toBe("choose");
    expect(entry.open.value).toBe(false);
    wallet.close();
    wrapper.unmount();
  });
});
