/**
 * The owner ingestion writes for (LOCAL_OWNER_ID) has no user account, so the
 * database refuses its rows (owner foreign key). Set LOCAL_OWNER_ID to the id
 * of an existing user.
 */
export class IngestionOwnerNotFoundError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Agent ingestion owner has no user row", options);
    this.name = "IngestionOwnerNotFoundError";
  }
}
