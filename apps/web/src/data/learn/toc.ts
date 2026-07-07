/* Table des matières dérivée des blocs `h` d'un article. Sert à la fois au
 * rendu (ancres d'ID sur les <h2> dans ArticleBody) et à la nav latérale
 * « On this page ». Le slug d'ancre doit être déterministe et identique des
 * deux côtés. */
import type { Block } from "./types";

/** Slug d'ancre stable pour un titre de section. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacritiques
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export interface TocEntry {
  id: string;
  text: string;
}

/** Titres de section (blocs `h`) d'un article, avec leur ancre. */
export function tableOfContents(blocks: Block[]): TocEntry[] {
  return blocks
    .filter((b): b is { type: "h"; text: string } => b.type === "h")
    .map((b) => ({ id: headingId(b.text), text: b.text }));
}
