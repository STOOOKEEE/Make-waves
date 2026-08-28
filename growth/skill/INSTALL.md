# Skill `x-growth` — copie versionnée

La skill vit normalement dans `.claude/skills/x-growth/`, mais `.claude/` est **gitignoré**
(convention du repo : outils Claude Code = local, par-dev). Cette copie sous `growth/skill/` existe
donc **uniquement pour la versionner et la partager** — ce n'est pas d'ici qu'elle est chargée.

`growth/skill/x-growth/` est une copie fidèle (SKILL.md + references/). La source d'exécution reste
`.claude/skills/x-growth/` sur chaque poste.

## Pour Armand — l'installer sur ton poste

Copie le dossier dans TON `.claude/skills/` (l'un ou l'autre) :

```bash
# Option A — niveau utilisateur (dispo dans tous tes projets)
cp -R growth/skill/x-growth ~/.claude/skills/x-growth

# Option B — niveau projet (ce repo seulement ; reste local, .claude est gitignoré)
cp -R growth/skill/x-growth .claude/skills/x-growth
```

Puis `/x-growth` (ou son déclenchement auto) sera disponible dans Claude Code.

## ⚠️ La skill lit `growth/` à la racine du repo

Les références internes de la skill pointent vers `growth/context/…` et `growth/log/…` **relatifs à la
racine du repo**. Elle n'est donc pleinement opérationnelle que lancée **depuis ce repo** (là où le
dossier `growth/` existe). Installée en niveau utilisateur, elle se chargera partout, mais son contenu
(voix, faits, cibles, journal) n'a de sens qu'ici.

## Garder les deux copies synchronisées

Si tu édites la skill, édite la **source** `.claude/skills/x-growth/` puis resynchronise la copie
versionnée avant de commit :

```bash
rm -rf growth/skill/x-growth && cp -R .claude/skills/x-growth growth/skill/x-growth
```

(Il n'y a pas d'automatisation de sync : deux copies, resynchro manuelle. Si ça devient pénible,
la vraie solution est de dé-ignorer `.claude/skills/` dans `.gitignore` et de supprimer cette copie.)
