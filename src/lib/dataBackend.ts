import "server-only";

export type DataBackend = "legacy" | "postgres";

/** Selects PostgreSQL explicitly; all other values preserve the legacy path. */
export function getDataBackend(): DataBackend {
  return process.env.DATA_BACKEND?.trim() === "postgres" ? "postgres" : "legacy";
}
