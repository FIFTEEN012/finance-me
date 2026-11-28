# The server is the source of truth for User Data

When the user is signed in, the copy of their User Data on the server is the real one; each browser keeps only a cache for speed and offline use. Before this, every browser treated its own localStorage as the truth and merged with the server afterwards, which made data differ between devices and domains, and let deleted or reset records come back. Device Preferences stay on each device.

Deletes are recorded rather than performed: a deleted record keeps its id and the time it was deleted, so every other device drops it and no device can upload it again. Concurrent edits to the same record are settled by the most recent edit. Guest Data is uploaded once, at the first sign-in on a device, and never again.

The kinds of User Data that previously lived only in the browser are stored in one shared table of records (owner, kind, id, data, last edited, deleted), so one sync, delete and Reset path serves all of them: supplies, Food Entries, water entries, Workout Sessions, the health profile, investment holdings, orders, dividends and portfolio snapshots, monthly expense logs and tracked categories, recurring rules, bill splits, settings and the Workout Plan (`SHARED_TABLE_KINDS` in `src/lib/sync/contract.ts` is the list). Transactions, categories, budgets, goals and debts keep their own tables (`OWN_TABLE_KINDS`), gaining last-edited and deleted times.

A Reset deletes every record on the server and starts a new Reset generation for the user. Each device remembers the generation it last heard from the server and stamps its queued changes with it; the server refuses changes queued under an older generation (made before that device knew of the Reset), and the device drops them. Changes from a device that has heard of the Reset are settled by the most recent edit as usual. Edit times are never compared with the server clock, so a device's clock and records deliberately dated as oldest (Guest Data, recurring occurrences) do not matter.

## Considered Options

- **Keep the browser as the truth and only improve merging.** Rejected: without a record of deletes, "missing on the server" can never be told apart from "not uploaded yet".
- **One table per kind for the new kinds.** Rejected for now: a table, API and sync path per kind for data the server never queries; a kind can move to its own table later if the server needs to query it.
