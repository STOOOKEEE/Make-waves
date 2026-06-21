import { convertStringToHex } from "xrpl";
import { InvalidMemoError } from "../errors";

/** Memo applicatif avant encodage (chaînes lisibles). */
export interface MemoInput {
  /** Catégorie du memo (ex. "tide/join"). Optionnel. */
  readonly type?: string;
  /** Charge utile (ex. id de tournoi). Obligatoire et non vide. */
  readonly data: string;
  /** Format MIME de la charge (ex. "text/plain"). Optionnel. */
  readonly format?: string;
}

/** Memo au format attendu par le protocole XRPL (champs hex). */
export interface XrplMemo {
  readonly Memo: {
    readonly MemoType?: string;
    readonly MemoData?: string;
    readonly MemoFormat?: string;
  };
}

/**
 * Encode un memo applicatif vers le format XRPL : tous les champs sont
 * hex-encodés (le protocole stocke des blobs). Lève `InvalidMemoError` si la
 * charge utile est vide.
 */
export function encodeMemo(memo: MemoInput): XrplMemo {
  if (memo.data.trim() === "") {
    throw new InvalidMemoError("Memo.data ne peut pas être vide");
  }

  const encoded: {
    MemoType?: string;
    MemoData: string;
    MemoFormat?: string;
  } = {
    MemoData: convertStringToHex(memo.data),
  };
  if (memo.type !== undefined) {
    encoded.MemoType = convertStringToHex(memo.type);
  }
  if (memo.format !== undefined) {
    encoded.MemoFormat = convertStringToHex(memo.format);
  }

  return { Memo: encoded };
}
