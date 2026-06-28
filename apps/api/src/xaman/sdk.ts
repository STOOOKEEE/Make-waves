import { XummSdk } from "xumm-sdk";
import type { XamanPayloadApi } from "./sign-request";

/** Type du payload attendu par `sdk.payload.create` (objet de tx générique). */
type XummCreatePayload = Parameters<XummSdk["payload"]["create"]>[0];

/**
 * Instancie l'API de payload XUMM réelle à partir des clés (lues depuis l'env au
 * câblage runtime, jamais en clair dans le repo). C'est l'unique frontière avec
 * `xumm-sdk` : un cast localisé via `unknown` (jamais `any`) y adapte notre
 * `txjson: object` au type ouvert du SDK. Le retour `CreatedPayload` est un
 * sur-ensemble structurel de `XamanCreatedPayload` → aucune adaptation au retour.
 *
 * Non testée unitairement (réseau + clés réelles) ; toute la logique applicative
 * vit au-dessus, sur l'interface `XamanPayloadApi` testable avec un faux.
 */
export function createXamanApi(
  apiKey: string,
  apiSecret: string,
): XamanPayloadApi {
  const sdk = new XummSdk(apiKey, apiSecret);
  return {
    create: ({ txjson }) =>
      sdk.payload.create({ txjson } as unknown as XummCreatePayload),
  };
}
