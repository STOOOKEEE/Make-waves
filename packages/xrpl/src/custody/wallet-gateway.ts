import { Client, Wallet, type Transaction } from "xrpl";
import { buildBadgeAcceptOffer } from "../tx/nft";
import { buildWalletFundingPayment } from "../tx/payment";
import { buildAccountDelete } from "../tx/account-delete";
import { assertAttributionTag } from "../tx/source-tag";
import { XrplRequestError } from "../client/errors";

/** Résultat utile d'une transaction serveur finalisée. */
export interface CustodySubmitResult {
  readonly hash: string;
}

interface SubmitResult {
  readonly result: { readonly hash: string; readonly meta?: unknown };
}

/** Sous-ensemble injectable de `xrpl.Client`, pour des tests sans réseau. */
export interface CustodyLedgerClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  autofill(tx: Transaction): Promise<Transaction>;
  submitAndWait(txBlob: string): Promise<SubmitResult>;
}

export interface XrplCustodialWalletGatewayDeps {
  readonly serverUrl: string;
  /** Seed du compte opérateur dédié au funding. */
  readonly funderSeed: string;
  readonly sourceTag: number;
  readonly clientFactory?: () => CustodyLedgerClient;
}

/**
 * Boundary XRPL des wallets Paper custodiaux : active le compte généré puis
 * signe l'acceptation d'un NFT après un claim explicite dans Tide.
 *
 * Cette classe ne stocke aucune seed utilisateur ; ce rôle appartient au store
 * chiffré de l'API. Toutes les transactions portent le SourceTag Tide.
 */
export class XrplCustodialWalletGateway {
  private readonly funder: Wallet;
  private readonly sourceTag: number;
  private readonly clientFactory: () => CustodyLedgerClient;

  constructor(deps: XrplCustodialWalletGatewayDeps) {
    assertAttributionTag(deps.sourceTag);
    this.funder = Wallet.fromSeed(deps.funderSeed);
    this.sourceTag = deps.sourceTag;
    this.clientFactory = deps.clientFactory ?? (() => new Client(deps.serverUrl));
  }

  /** Adresse publique du hot funder, utile aux contrôles de séparation au boot. */
  get funderAddress(): string {
    return this.funder.classicAddress;
  }

  async fundWallet(destination: string, amountDrops: string): Promise<CustodySubmitResult> {
    return this.submit(
      this.funder,
      buildWalletFundingPayment({
        account: this.funder.classicAddress,
        destination,
        amountDrops,
        sourceTag: this.sourceTag,
      }),
    );
  }

  /**
   * Active un nouveau compte depuis un wallet custodial Tide existant. La seed
   * source n'est conservée ni par le gateway ni dans une transaction : elle ne
   * sert qu'à signer le Payment en mémoire.
   */
  async fundWalletFromSeed(
    sourceSeed: string,
    destination: string,
    amountDrops: string,
  ): Promise<CustodySubmitResult> {
    const source = Wallet.fromSeed(sourceSeed);
    return this.submit(
      source,
      buildWalletFundingPayment({
        account: source.classicAddress,
        destination,
        amountDrops,
        sourceTag: this.sourceTag,
      }),
    );
  }

  async acceptNft(seed: string, sellOfferId: string): Promise<CustodySubmitResult> {
    const recipient = Wallet.fromSeed(seed);
    return this.submit(
      recipient,
      buildBadgeAcceptOffer({
        account: recipient.classicAddress,
        sellOfferId,
        sourceTag: this.sourceTag,
      }),
    );
  }

  /**
   * Clôture un compte custodial : AccountDelete taggé, le solde restant part à
   * la destination. Non rejouable financièrement : un compte supprimé n'existe
   * plus, un retry après résultat ambigu échoue sans double dépense.
   */
  async deleteAccount(
    seed: string,
    destination: string,
    feeDrops: string,
  ): Promise<CustodySubmitResult> {
    const account = Wallet.fromSeed(seed);
    return this.submit(
      account,
      buildAccountDelete({
        account: account.classicAddress,
        destination,
        feeDrops,
        sourceTag: this.sourceTag,
      }),
    );
  }

  private async submit(wallet: Wallet, tx: Transaction): Promise<CustodySubmitResult> {
    const client = this.clientFactory();
    await client.connect();
    try {
      const prepared = await client.autofill(tx);
      const signed = wallet.sign(prepared);
      const submitted = await client.submitAndWait(signed.tx_blob);
      assertValidatedSuccess(submitted);
      return { hash: submitted.result.hash };
    } finally {
      await client.disconnect();
    }
  }
}

function assertValidatedSuccess(submitted: SubmitResult): void {
  const meta = submitted.result.meta;
  if (typeof meta !== "object" || meta === null) {
    throw new XrplRequestError("submitAndWait: metadata de validation absente");
  }
  const result = (meta as Record<string, unknown>)["TransactionResult"];
  if (result !== "tesSUCCESS") {
    throw new XrplRequestError(`Transaction XRPL non appliquée: ${String(result)}`);
  }
}
