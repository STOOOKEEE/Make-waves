# 🔍 Audit Tide — état réel du projet

> **But du dossier.** Évaluer honnêtement l'état du projet Tide **en lisant le code, pas les docs**, avec un objectif directeur : **rendre tout fonctionnel et déployable sur XRPL mainnet**.
>
> **Date de l'audit :** 2026-07-07
> **Méthode :** lecture directe du code source (`packages/*`, `apps/*`), exécution d'aucune supposition tirée de `CLAUDE.md`/`SPEC.md`/`DEVLOG.md`. Chaque affirmation renvoie à un chemin de code réel.

## Légende des feux

| Feu | Signification |
|-----|---------------|
| ✅ | **Fonctionnel & câblé** — code réel, testé, monté dans le runtime (`main.ts`) |
| 🟡 | **Codé mais dormant** — le code existe mais est désactivé par config, ou non branché à l'UI / au runtime |
| 🔴 | **Stub qui échoue** — le code existe mais lève une erreur à l'exécution (pas de faux succès) |
| ⚪ | **Décor / statique** — contenu de démo sans logique ni backend |

## Ordre de lecture recommandé

1. **[00-SYNTHESE.md](00-SYNTHESE.md)** — le verdict en une page (à lire en premier).
2. **[01-INVENTAIRE-FEATURES.md](01-INVENTAIRE-FEATURES.md)** — la carte de vérité : chaque feature, son feu, sa preuve code.
3. **[02-PAPER-TRADING.md](02-PAPER-TRADING.md)** — ce qui marche vraiment.
4. **[03-LIVE-ONCHAIN.md](03-LIVE-ONCHAIN.md)** — la couche mainnet : codée mais non prouvée.
5. **[04-AI-AGENT-MCP.md](04-AI-AGENT-MCP.md)** — l'agent IA, à moitié câblé.
6. **[05-DEPLOIEMENT.md](05-DEPLOIEMENT.md)** — état de l'infra (spoiler : inexistante) + matrice d'env.
7. **[06-CHECKLIST-MAINNET.md](06-CHECKLIST-MAINNET.md)** — le plan d'action séquencé vers le mainnet.
8. **[07-DETTE-RISQUES.md](07-DETTE-RISQUES.md)** — dette technique et risques.

## Verdict en une phrase

**Le paper trading est réel, complet et solide ; la couche on-chain/Live est bien codée mais dormante et non prouvée sur mainnet ; l'AI agent est à moitié câblé ; et il n'existe aucune infrastructure de déploiement.**

## Contexte projet

- **Produit :** paper trading + compétitions on-chain sur XRPL, avec passage au trading réel (mode Live). Hackathon Make Waves XRPL.
- **Docs de référence produit :** [`../SPEC.md`](../SPEC.md), [`../ROADMAP.md`](../ROADMAP.md), [`../DEVLOG.md`](../DEVLOG.md), [`../../CLAUDE.md`](../../CLAUDE.md).
- **Ce dossier ≠ ces docs :** ici on décrit ce que le code **fait réellement**, pas ce qui est **prévu**.
