// AgentChatService — pont entre l'UI front et le runtime Claude API.
//
// Stream les réponses Claude via SSE, intercepte les tool_use, exécute les
// outils via le code MCP serveur (les `ToolDef` partagés avec `@tide/mcp`),
// injecte les tool_result, et reboucle jusqu'à `end_turn`. Le front voit
// l'agent taper en temps réel (`text_delta`) et reçoit les tool_result
// sérialisés quand l'agent appelle un outil.
//
// Architecture assumée :
// - Le `client` Anthropic est injectable (`clientFactory`) → testable sans
//   réseau ni clé (cf. `agent-chat-service.test.ts`).
// - Les `mcpTools` sont les `ToolDef` du package `@tide/mcp` — on les
//   dispatche par `name`, pas par code d'enregistrement. Avantage : le
//   câblage runtime de `apps/api` partage la même liste que `@tide/mcp`.
// - Le `McpContext` (typage `@tide/mcp`) est propagé tel quel aux handlers
//   des outils — c'est le contrat commun. Les outils d'écriture
//   (place_order, join_competition...) lisent leur audit/guard via `ctx`,
//   comme dans MCP.

import Anthropic from "@anthropic-ai/sdk";
import type { McpContext } from "@tide/mcp";
import { tools as mcpTools } from "@tide/mcp/tools";
import type { ToolDef } from "@tide/mcp/tools";

/** Événements émis par `AgentChatService.stream(...)`. Le front les
 * sérialise en SSE (`data: ${JSON.stringify(event)}\n\n`). Discriminé par
 * `type` : `text_delta` = token de texte, `tool_result` = sortie d'un
 * outil exécuté côté serveur, `done` = fin de tour, `error` = erreur
 * remontée au front (avec `message` lisible). */
export type AgentChatEvent =
  | { type: "text_delta"; data: { text: string } }
  | { type: "tool_result"; data: { name: string; result: unknown } }
  | { type: "error"; data: { message: string } }
  | { type: "done" };

/**
 * Constructeur du client Anthropic — injectable pour les tests. Reçoit un
 * `baseUrl` optionnel : tout endpoint **Anthropic-compatible** (ex. DeepSeek
 * `https://api.deepseek.com/anthropic`) est piloté par le même SDK, tool-use
 * inclus — d'où le support multi-provider sans réécrire le service.
 */
export type AnthropicClientFactory = (baseUrl?: string) => Anthropic;

/** Implémentation par défaut : lit `ANTHROPIC_API_KEY` (poussée par le service)
 * et cible `baseUrl` s'il est fourni, sinon l'API Anthropic. */
export const defaultAnthropicClientFactory: AnthropicClientFactory = (baseUrl) =>
  new Anthropic(baseUrl !== undefined ? { baseURL: baseUrl } : {});

/** État accumulé d'un tool_use pendant le stream — l'input JSON arrive
 * par fragments (`InputJSONDelta`) et n'est déserialisé qu'à la fermeture
 * du bloc (`content_block_stop`). */
interface ToolUseState {
  readonly id: string;
  readonly name: string;
  /** Buffer JSON pendant l'accumulation, objet déserialisé après stop. */
  input: string | Record<string, unknown>;
}

export interface AgentChatServiceDeps {
  /** Clé API du provider (`TIDE_LLM_API_KEY`) — non journalisée, non renvoyée. */
  readonly apiKey: string;
  /** Modèle (`TIDE_LLM_MODEL`) — `deepseek-v4-flash`, `claude-sonnet-4-5`, etc. */
  readonly model: string;
  /**
   * Endpoint Anthropic-compatible (`TIDE_LLM_BASE_URL`). Absent → API Anthropic.
   * Ex. DeepSeek : `https://api.deepseek.com/anthropic`.
   */
  readonly baseUrl?: string;
  /** `max_tokens` envoyé au modèle. Défaut 4096. */
  readonly maxTokens?: number;
  /** Factory du client — défaut = `new Anthropic()`. Injectable pour les
   * tests. */
  readonly clientFactory?: AnthropicClientFactory;
}

export interface AgentChatStreamInput {
  readonly agentId: string;
  readonly userId: string;
  /** Mandat sérialisé ou `null` — passé au `ctx.mandate` du MCP. */
  readonly mandate: unknown;
  /** Historique de la conversation (rôles user/assistant). Optionnel. */
  readonly history?: ReadonlyArray<{
    readonly role: "user" | "assistant";
    readonly content: string;
  }>;
  /** Nouveau message utilisateur (le prompt en cours). */
  readonly message: string;
  /** System prompt injecté en tête de chaque appel. */
  readonly systemPrompt?: string;
  /** Contexte MCP — transport des deps d'exécution. Les outils
   * `place_order` / `join_competition` etc. en ont besoin (mandat, prix,
   * audit, garde-fous). */
  readonly ctx: McpContext;
}

/**
 * Service de chat agent : fait le pont UI ↔ Claude API en pilotant la
 * boucle agentique (text → tool_use → tool_result → text) et en émettant
 * chaque étape comme un événement consommé par le front (SSE).
 *
 * Pas d'I/O au constructeur ; la `clientFactory` est appelée paresseusement
 * à chaque appel `stream(...)` (utile quand la clé change entre tests ou
 * pour ne pas connecter au boot).
 */
export class AgentChatService {
  /** Garde-fou : 5 itérations max. Au-delà, c'est une boucle de l'agent
   * (Claude appelle un outil qui rappelle Claude qui rappelle l'outil...).
   * On préfère yield une erreur que de faire fondre la facture LLM. */
  static readonly MAX_TOOL_ITERATIONS = 5;

  private readonly clientFactory: AnthropicClientFactory;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly apiKey: string;
  private readonly baseUrl?: string;
  /** Outils exposés à Claude — par défaut la liste partagée `@tide/mcp`. */
  private readonly tools: ReadonlyMap<string, ToolDef>;

  constructor(deps: AgentChatServiceDeps) {
    this.apiKey = deps.apiKey;
    this.model = deps.model;
    this.maxTokens = deps.maxTokens ?? 4096;
    this.baseUrl = deps.baseUrl;
    this.clientFactory = deps.clientFactory ?? defaultAnthropicClientFactory;
    // Construit une map `name → ToolDef` pour le dispatch O(1). Si l'appelant
    // veut un sous-ensemble, on accepte `deps.mcpToolsOverride` plus tard.
    this.tools = new Map(mcpTools.map((t) => [t.name, t]));
  }

  /**
   * Pilote une conversation avec Claude. Yield les événements à mesure
   * que le modèle écrit, exécute les outils côté serveur quand le LLM les
   * demande, reboucle avec le tool_result, et termine quand Claude émet
   * `end_turn` (réponse textuelle sans tool_use en attente) ou après
   * `MAX_TOOL_ITERATIONS` itérations (sécurité).
   */
  async *stream(
    input: AgentChatStreamInput,
  ): AsyncGenerator<AgentChatEvent, void, void> {
    // Le SDK Anthropic lit `ANTHROPIC_API_KEY` au constructeur. On pousse
    // la clé via l'env au cas où l'appelant ne la passerait pas dans la
    // factory. L'effet est local à ce process, restauré en `finally`.
    const previousKey = process.env["ANTHROPIC_API_KEY"];
    process.env["ANTHROPIC_API_KEY"] = this.apiKey;
    const client = this.clientFactory(this.baseUrl);
    try {
      yield* this.drive(client, input);
    } finally {
      // Restaure l'env précédent (test isolation : si un test ne fixait pas
      // la clé, on ne pollue pas les tests suivants).
      if (previousKey === undefined) {
        delete process.env["ANTHROPIC_API_KEY"];
      } else {
        process.env["ANTHROPIC_API_KEY"] = previousKey;
      }
    }
  }

  private async *drive(
    client: Anthropic,
    input: AgentChatStreamInput,
  ): AsyncGenerator<AgentChatEvent, void, void> {
    const messages: Array<Anthropic.MessageParam> = this.buildMessages(input);
    const toolDefs: Anthropic.Tool[] = this.buildToolDefs();
    const system = this.buildSystem(input);

    // Boucle agentique : un appel `messages.stream` peut produire 0..N
    // tool_use, on les exécute tous puis on reboucle.
    for (let iter = 0; iter < AgentChatService.MAX_TOOL_ITERATIONS; iter++) {
      const stream = client.messages.stream({
        model: this.model,
        max_tokens: this.maxTokens,
        system,
        tools: toolDefs,
        messages,
      });

      // Accumule les tool_use en cours d'itération, CLÉS PAR L'INDEX GLOBAL
      // du bloc (`event.index`), pas par ordre de push : un modèle qui émet
      // des blocs `thinking`/texte AVANT le `tool_use` (ex. DeepSeek V4) place
      // le tool_use à un index > 0, et les `input_json_delta` portent ce même
      // index — une Map par index évite de perdre l'input (bug : `toolUses[i]`
      // sur un tableau compact ne matchait que si le tool_use était en index 0).
      const toolUsesByIndex = new Map<number, ToolUseState>();

      for await (const event of stream) {
        switch (event.type) {
          case "content_block_start": {
            // Mémorise le tool_use pour accumuler ses deltas JSON.
            const block = event.content_block;
            if (block.type === "tool_use") {
              toolUsesByIndex.set(event.index, { id: block.id, name: block.name, input: "" });
            }
            break;
          }
          case "content_block_delta": {
            // Texte : yield text_delta au front. JSON de tool_use : on
            // accumule dans le buffer (on déserialise à stop).
            if (event.delta.type === "text_delta") {
              yield { type: "text_delta", data: { text: event.delta.text } };
            } else if (event.delta.type === "input_json_delta") {
              const tu = toolUsesByIndex.get(event.index);
              if (tu !== undefined && typeof tu.input === "string") {
                tu.input = tu.input + event.delta.partial_json;
              }
            }
            break;
          }
          case "content_block_stop": {
            // Ferme le bloc. Si c'est un tool_use, déserialise l'input
            // JSON accumulé (vide → input par défaut `{}`).
            const tu = toolUsesByIndex.get(event.index);
            if (tu !== undefined && typeof tu.input === "string") {
              if (tu.input === "") {
                tu.input = {};
              } else {
                try {
                  tu.input = JSON.parse(tu.input) as Record<string, unknown>;
                } catch {
                  // Input JSON mal formé — on garde la string pour qu'elle
                  // apparaisse dans le tool_result, le LLM pourra s'auto-
                  // corriger.
                }
              }
            }
            break;
          }
          case "message_delta":
          case "message_start":
          case "message_stop":
            // message_stop = fin de l'itération courante (la boucle
            // `for await` se termine naturellement). On a déjà tout ce
            // qu'il faut dans `toolUses`. No-op.
            break;
          default: {
            // Garde-fou future-proof : un nouveau type d'event n'est pas
            // un bug — on l'ignore explicitement.
            break;
          }
        }
      }

      // Snapshot ordonné des tool_use de l'itération (ordre d'index croissant
      // garanti par l'insertion Map dans l'ordre des `content_block_start`).
      const toolUses = [...toolUsesByIndex.values()];

      // Pas de tool_use en attente : fin de tour, on yield `done` et on
      // sort de la boucle agentique.
      if (toolUses.length === 0) {
        yield { type: "done" };
        return;
      }

      // Exécute les outils côté serveur. Chaque résultat devient un
      // `tool_result` qu'on reboucle à Claude.
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const inputObj =
          typeof tu.input === "object" ? tu.input : {};
        const result = await this.executeTool(tu.name, inputObj, input.ctx);
        const isError =
          (result as { isError?: boolean } | null)?.isError === true;
        const content = isError
          ? (result as { message?: string }).message ?? "Tool error"
          : JSON.stringify(result);
        const block: Anthropic.ToolResultBlockParam = {
          type: "tool_result",
          tool_use_id: tu.id,
          content,
          ...(isError ? { is_error: true } : {}),
        };
        toolResultBlocks.push(block);
        yield {
          type: "tool_result",
          data: { name: tu.name, result: result ?? null },
        };
      }

      // Reboucle avec l'historique complet. On ajoute l'assistant turn
      // (les tool_use) puis le user turn (les tool_result). Claude
      // accepte cette séquence.
      const assistantBlocks: Anthropic.ToolUseBlockParam[] = toolUses.map(
        (tu) => ({
          type: "tool_use",
          id: tu.id,
          name: tu.name,
          input:
            typeof tu.input === "object" ? tu.input : {},
        }),
      );
      messages.push({ role: "assistant", content: assistantBlocks });
      messages.push({ role: "user", content: toolResultBlocks });
      // Pas de yield `done` ici — on reboucle. La boucle externe gère
      // l'arrêt via `toolUses.length === 0` au prochain tour.
    }

    // Garde-fou : on a dépassé MAX_TOOL_ITERATIONS. On yield l'erreur et
    // on sort proprement.
    yield {
      type: "error",
      data: { message: "Max tool iterations reached" },
    };
  }

  /** Construit la liste initiale de messages : historique + nouveau prompt. */
  private buildMessages(
    input: AgentChatStreamInput,
  ): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];
    for (const h of input.history ?? []) {
      messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: "user", content: input.message });
    return messages;
  }

  /** Projette les `ToolDef` MCP vers le format `tools` du SDK Anthropic. */
  private buildToolDefs(): Anthropic.Tool[] {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      // `ToolDef.inputSchema` est typé `Record<string, unknown>` pour rester
      // permissif côté MCP ; en pratique chaque schéma porte déjà
      // `type: "object"` (cf. les définitions des tools). On narrow-cast
      // vers la shape stricte d'Anthropic juste ici (frontière SDK), puis
      // `satisfies Anthropic.Tool` valide le reste de l'objet sans cast
      // global (vs l'ancien `as Anthropic.Tool` qui bypassait tout check).
      input_schema: t.inputSchema as Anthropic.Tool["input_schema"],
    }) satisfies Anthropic.Tool);
  }

  /** System prompt : consigne de l'agent + signature Tide. */
  private buildSystem(input: AgentChatStreamInput): string {
    return input.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  }

  /** Dispatche l'appel outil vers le bon `ToolDef` MCP. Capture les
   * `McpError` levées par les handlers (RISK_LIMIT, MANDATE_INVALID...)
   * pour que le tool_result ait `is_error: true` et que Claude puisse
   * adapter son raisonnement. */
  private async executeTool(
    name: string,
    args: Record<string, unknown>,
    ctx: McpContext,
  ): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { isError: true, message: `Unknown tool: ${name}` };
    }
    try {
      return await tool.handler(args, ctx);
    } catch (err) {
      // Les `McpError` (RISK_LIMIT etc.) sont des erreurs applicatives
      // attendues — on les remonte à Claude comme `is_error` pour qu'il
      // adapte son raisonnement (refus de risque → ne pas réessayer).
      // Toute autre erreur : on la signale aussi mais en conservant le
      // `message` (ne pas le perdre dans un crash silencieux).
      const message = err instanceof Error ? err.message : String(err);
      return { isError: true, message };
    }
  }
}

/** System prompt par défaut. L'agent sait qu'il est dans Tide, qu'il
 * a accès à un set d'outils financier, et qu'il doit rester concis. */
const DEFAULT_SYSTEM_PROMPT = [
  "You are a Tide trading agent. You help the user trade, query market data,",
  "join competitions, and manage positions. You have access to a set of tools",
  "(market data, portfolio, orders, positions, competitions, mandate info).",
  "Use them when needed.",
  // Rendu : le front affiche du texte simple (gras `**...**` et code `` `...` ``",
  // supportés, rien d'autre). On interdit donc les tableaux/titres markdown.
  "Formatting rules: reply in short, plain prose. Do NOT use markdown tables,",
  "headings, or bullet lists. You may use **bold** and `code` sparingly.",
  "Keep answers concise; only explain when asked. Prefer 1-3 sentences.",
].join(" ");
