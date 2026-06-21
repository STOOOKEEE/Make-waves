import { createRequire } from "node:module";
import type { DatabaseSync } from "node:sqlite";

// `node:sqlite` est un builtin récent que le bundler de vitest (vite) ne sait pas
// résoudre statiquement (il strippe `node:` et cherche un paquet `sqlite`). On le
// charge au runtime via createRequire, en gardant le typage via l'import de type.
const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync: DatabaseSyncCtor } = nodeRequire(
  "node:sqlite",
) as typeof import("node:sqlite");

/** Ouvre une base SQLite (`:memory:` par défaut). Source unique du chargement. */
export function openDatabase(path = ":memory:"): DatabaseSync {
  return new DatabaseSyncCtor(path);
}

export type { DatabaseSync };
