/* ===== Tutoriel — projecteur =====
 *
 * À chaque étape, une seule zone compte. Tout le reste est mis en retrait
 * (flouté et atténué) pour qu'il n'y ait aucune ambiguïté sur l'endroit où
 * regarder. C'est la même mécanique que `.deck.locked` du vrai terminal, mais
 * au service de l'attention au lieu du verrouillage.
 *
 * Les zones forment une hiérarchie par point : `ticket.leverage` est dans
 * `ticket`. Un conteneur qui contient la cible ne doit **pas** être flouté,
 * sinon la cible le serait aussi (le filtre CSS est hérité).
 *
 * Module pur, sans DOM ni géométrie : testable, et insensible au fait que
 * `getBoundingClientRect()` renvoie des zéros sous happy-dom.
 */

/** `spot` = la cible · `plain` = neutre (conteneur de la cible) · `dim` = en retrait. */
export type ZoneState = "spot" | "plain" | "dim";

export function zoneState(spotlight: string | undefined, zone: string): ZoneState {
  if (spotlight === undefined || spotlight === "") return "plain";
  if (zone === spotlight) return "spot";
  // Descendant de la cible : neutre. Il est déjà montré par l'anneau de son
  // conteneur — lui en donner un aussi produirait onze anneaux sur le ticket.
  if (zone.startsWith(`${spotlight}.`)) return "plain";
  // Ancêtre de la cible : neutre, surtout pas flouté (le filtre est hérité).
  if (spotlight.startsWith(`${zone}.`)) return "plain";
  return "dim";
}

/** Classes CSS prêtes à poser sur une zone. */
export function zoneClass(
  spotlight: string | undefined,
  zone: string,
): Record<string, boolean> {
  const state = zoneState(spotlight, zone);
  return { "zone-spot": state === "spot", "zone-dim": state === "dim" };
}
