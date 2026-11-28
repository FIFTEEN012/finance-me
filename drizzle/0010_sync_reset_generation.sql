ALTER TABLE "sync_resets" ADD COLUMN "generation" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Every existing row is one Reset already run.
UPDATE "sync_resets" SET "generation" = 1;
