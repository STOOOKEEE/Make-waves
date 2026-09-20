import type { Client } from "xrpl";

/**
 * Enveloppe de requête générique (au moins un `command`). On ne sur-type pas la
 * couche injectée : chaque méthode de haut niveau valide ensuite le `result`
 * défensivement (on ne fait jamais confiance à une réponse réseau).
 */
export interface XrplRequestEnvelope {
  readonly command: string;
  readonly [key: string]: unknown;
}

/** Enveloppe de réponse : tout ce qu'on consomme est sous `result`. */
export interface XrplResponseEnvelope {
  readonly result: unknown;
}

/**
 * Surface réseau minimale dont Tide a besoin, INJECTÉE → toute la couche client
 * est testable sans réseau (faux `XrplConnection` en test). Un `Client` xrpl.js
 * réel n'est pas directement assignable (sa surcharge `request` est générique) :
 * passer par `adaptXrplClient` au point d'injection mainnet.
 */
export interface XrplConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  request(request: XrplRequestEnvelope): Promise<XrplResponseEnvelope>;
}

/**
 * Adapte un `Client` xrpl.js réel vers `XrplConnection`. C'est l'unique frontière
 * avec la lib externe : son `request` est surchargé et n'accepte pas notre
 * enveloppe ouverte, d'où un cast localisé (via `unknown`, jamais `any`). Cette
 * fonction n'est pas testée unitairement (elle exige un vrai réseau) ; toute la
 * logique applicative vit au-dessus, sur l'interface `XrplConnection` testable.
 */
export function adaptXrplClient(client: Client): XrplConnection {
  return {
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
    isConnected: () => client.isConnected(),
    request: async (request) => {
      const response = await client.request(
        request as unknown as Parameters<typeof client.request>[0],
      );
      return { result: response.result };
    },
  };
}
