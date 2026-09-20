# 05 — Déploiement & configuration ❌

> **Verdict : état « dev local / démo ». Aucune infrastructure de déploiement n'existe. Le projet se lance à la main via `tsx` et `vite`.**

## Ce qui EXISTE

Lancer localement, aujourd'hui, en **mode off-chain pur** (aucune env requise) :

```bash
pnpm install
pnpm --filter @tide/api start   # tsx src/main.ts → 0.0.0.0:3000, SQLite tide.db
pnpm --filter @tide/web dev     # vite → VITE_API_BASE=http://localhost:3000
pnpm --filter @tide/web build   # vite build → apps/web/dist/
```

Scripts racine (`package.json`) : `test` (`vitest run`), `typecheck` (`pnpm -r typecheck`), `lint` (`eslint .`). **Pas de script de build/deploy à la racine.**

Au boot, l'API : ouvre SQLite, migre les tables, seed compétitions + comptes démo, démarre le feed CoinGecko (30s), et log l'état des features :
```
[on-chain:off indexeur:off xaman:off live:off chat:off]   (main.ts:326-330)
```

## Ce qui MANQUE (infra)

| Élément | État |
|---------|------|
| Dockerfile / docker-compose | ❌ Aucun |
| CI (`.github/workflows`) | ❌ Aucun dossier `.github/` |
| Manifeste host (`vercel.json`, `fly.toml`, `render.yaml`, `Procfile`) | ❌ Aucun |
| Build backend packagé | ❌ API tourne via `tsx` (pas de compilation TS→JS de prod) |
| Script de déploiement | ❌ Aucun (le seul `broadcast/DeployMarginVault.s.sol` est un script **Foundry EVM** local, sans rapport avec l'app XRPL) |
| Build front | ✅ `vite build` existe → `apps/web/dist/` |

## Matrice d'activation des features par env

Source : `.env.example` + `apps/api/src/config/env.ts`. **Tout est OFF tant que l'env est absente.**

| Feature | Variable(s) requise(s) | Note |
|---------|------------------------|------|
| Serveur | `PORT` (défaut 3000), `TIDE_DB_PATH` (défaut `tide.db`) | optionnel |
| Feed prix CEX | `CEX_BASE_URL` (défaut CoinGecko) | toujours actif |
| Client XRPL on-chain | `XRPL_WSS_URL` | ex. `wss://xrplcluster.com` (mainnet) |
| Feed prix AMM on-chain | `XRPL_WSS_URL` **+ `ONCHAIN_POOLS` non vide** | ⚠️ `ONCHAIN_POOLS={}` **hardcodé** dans `main.ts:64` — non activable sans éditer le code |
| Indexeur d'attribution | `XRPL_WSS_URL` + `TIDE_INDEXED_ACCOUNTS` + `TIDE_SOURCE_TAG` | `TIDE_ATTRIBUTION_DB_PATH` sinon en mémoire (perdu au reboot) |
| Signature Xaman `/sign/*` | `XUMM_API_KEY` + `XUMM_API_SECRET` + `TIDE_SOURCE_TAG` + `TIDE_PRIZE_POOL_ADDRESS` | secrets, jamais commit |
| Moteur Live spot `/exec/plan` | `TIDE_SOURCE_TAG` | quote RLUSD mainnet par défaut |
| Live token custom / testnet | `TIDE_RLUSD_ISSUER` (+ `TIDE_SOURCE_TAG`) | surcharge l'issuer mainnet |
| Chiffrement clés agents Live | `TIDE_AGENT_KEY_MASTER` (64 hex / 32 bytes) | mode Live agent |
| Chat agent LLM `/api/agent-chat/stream` | `TIDE_LLM_API_KEY` (+ `TIDE_LLM_MODEL`, défaut `claude-sonnet-4-5`) | ⚠️ ctx stubbé (voir [04](04-AI-AGENT-MCP.md)) |

## Règles « fail loud »

Une config **partielle** fait crasher au démarrage (choix volontaire) :
- XUMM sans SourceTag → lève.
- `TIDE_RLUSD_ISSUER` sans SourceTag → lève.
- comptes indexés sans SourceTag → lève.

C'est une bonne posture : impossible de démarrer à moitié configuré.

## Distinction testnet/mainnet

**Il n'y en a aucune dans le code.** Le réseau = `XRPL_WSS_URL`. Le seul biais mainnet en dur est l'issuer RLUSD (`plan-live.ts:35`). Pour testnet : URL testnet **+** `TIDE_RLUSD_ISSUER` testnet.

## Ce qu'il faut construire pour déployer

1. **Backend packagé** — soit garder `tsx` en prod (simple mais lourd), soit compiler (`tsc`/`esbuild`) → image légère.
2. **Dockerfile** (api + web servi statiquement ou via CDN) + volume pour `tide.db`.
3. **Host** — le back a un état SQLite disque → nécessite un host avec volume persistant (Fly.io, Render, VPS), **pas** un serverless éphémère par défaut.
4. **Front** — `vite build` → `dist/` servi en statique (Netlify/Vercel/CDN), `VITE_API_BASE` pointé sur l'API.
5. **Secrets** — gestion des `.env` (XUMM, LLM, SourceTag) hors repo.
6. **(optionnel) CI** — `pnpm test && pnpm typecheck && pnpm lint` sur PR.

➡️ Séquencement dans [06-CHECKLIST-MAINNET.md](06-CHECKLIST-MAINNET.md).
