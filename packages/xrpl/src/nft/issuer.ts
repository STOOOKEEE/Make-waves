import { Client, Wallet, type Transaction } from "xrpl";
import {
  buildBadgeMint,
  buildBadgeSellOffer,
  readMintedNftId,
  readOfferId,
} from "../tx/nft";
import { assertAttributionTag } from "../tx/source-tag";
import { XrplRequestError } from "../client/errors";

// ponytail: on utilise le Client `xrpl` en direct pour le mint issuer (le
// wrapper read-only du package n'a pas de signature par seed — la signature
// user passe par Xaman). Le mint est signé serveur avec la clé de l'issuer.

/** Résultat d'un mint + sell-offer de badge côté issuer. */
export interface NftIssueResult {
  readonly nftTokenId: string;
  readonly sellOfferId: string;
  readonly mintHash: string;
  readonly offerHash: string;
}

/** Boundary d'émission d'un badge NFT. Injectée dans le service (fake en test). */
export interface NftIssuer {
  issueBadge(params: {
    uri: string;
    taxon: number;
    destination: string;
  }): Promise<NftIssueResult>;
}

/** Résultat minimal d'un `submitAndWait` : hash de tx + métadonnées. */
interface SubmitResult {
  readonly result: { readonly hash: string; readonly meta?: unknown };
}

/**
 * Sous-ensemble du `Client` xrpl utilisé par l'issuer. Permet d'injecter un
 * faux ledger en test (autofill/submit sans réseau).
 */
export interface IssuerLedgerClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  autofill(tx: Transaction): Promise<Transaction>;
  submitAndWait(txBlob: string): Promise<SubmitResult>;
}

export interface XrplNftIssuerDeps {
  /** URL WSS du nœud XRPL (mainnet). */
  readonly serverUrl: string;
  /** Seed du compte issuer (clé serveur ; ne quitte jamais le backend). */
  readonly issuerSeed: string;
  /** SourceTag d'attribution Tide (non nul). */
  readonly sourceTag: number;
  /** Fabrique de client (défaut : `new Client(serverUrl)`). Injectable en test. */
  readonly clientFactory?: () => IssuerLedgerClient;
}

/**
 * Émet un badge NFT on-demand : mint soulbound signé par l'issuer, puis
 * sell-offer à 0 réservée au wallet du user. Renvoie le `NFTokenID` et l'id
 * d'offre à faire accepter (signer) par le user.
 */
export class XrplNftIssuer implements NftIssuer {
  private readonly wallet: Wallet;
  private readonly sourceTag: number;
  private readonly clientFactory: () => IssuerLedgerClient;

  constructor(deps: XrplNftIssuerDeps) {
    assertAttributionTag(deps.sourceTag);
    this.wallet = Wallet.fromSeed(deps.issuerSeed);
    this.sourceTag = deps.sourceTag;
    this.clientFactory =
      deps.clientFactory ?? (() => new Client(deps.serverUrl));
  }

  /** Adresse classique de l'issuer (dérivée du seed). */
  get issuerAddress(): string {
    return this.wallet.classicAddress;
  }

  async issueBadge(params: {
    uri: string;
    taxon: number;
    destination: string;
  }): Promise<NftIssueResult> {
    const client = this.clientFactory();
    await client.connect();
    try {
      const mint = buildBadgeMint({
        issuer: this.wallet.classicAddress,
        uri: params.uri,
        taxon: params.taxon,
        sourceTag: this.sourceTag,
      });
      const mintResult = await this.signAndSubmit(client, mint);
      const nftTokenId = readMintedNftId(mintResult.result.meta);

      const offer = buildBadgeSellOffer({
        issuer: this.wallet.classicAddress,
        nftTokenId,
        destination: params.destination,
        sourceTag: this.sourceTag,
      });
      const offerResult = await this.signAndSubmit(client, offer);
      const sellOfferId = readOfferId(offerResult.result.meta);

      return {
        nftTokenId,
        sellOfferId,
        mintHash: mintResult.result.hash,
        offerHash: offerResult.result.hash,
      };
    } finally {
      await client.disconnect();
    }
  }

  private async signAndSubmit(
    client: IssuerLedgerClient,
    tx: Transaction,
  ): Promise<SubmitResult> {
    const prepared = await client.autofill(tx);
    const signed = this.wallet.sign(prepared);
    const submitted = await client.submitAndWait(signed.tx_blob);
    assertValidatedSuccess(submitted);
    return submitted;
  }
}

/** `submitAndWait` peut retourner un tec inclus : un hash ne suffit pas. */
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
