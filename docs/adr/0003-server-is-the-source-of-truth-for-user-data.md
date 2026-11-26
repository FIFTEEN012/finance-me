# The server is the source of truth for User Data

When the user is signed in, the copy of their User Data on the server is the real one; each browser keeps only a cache for speed and offline use. Before this, every browser treated its own localStorage as the truth and merged with the server afterwards, which made data differ between devices and domains, and let deleted or reset records come back. Device Preferences stay on each device.

Deletes are recorded rather than performed: a deleted record keeps its id and the time it was deleted, so every other device drops it and no device can upload it again. Concurrent edits to the same record are settled by the most recent edit. Guest Data is uploaded once, at the first sign-in on a device, and never again.

The ten kinds of User Data that previously lived only in the browser (supplies, food and water, Workout Sessions, recurring rules, bill splits, investments, monthly expense logs, the Workout Plan, settings) are stored in one shared table of records (owner, kind, id, data, last edited, deleted), so one sync, delete and Reset path serves all of them. Transactions, categories, budgets, goals and debts keep their own tables, gaining last-edited and deleted times.

## Considered Options

- **Keep the browser as the truth and only improve merging.** Rejected: without a record of deletes, "missing on the server" can never be told apart from "not uploaded yet".
- **One table per kind for the ten new kinds.** Rejected for now: ten tables, APIs and sync paths for data the server never queries; a kind can move to its own table later if the server needs to query it.
