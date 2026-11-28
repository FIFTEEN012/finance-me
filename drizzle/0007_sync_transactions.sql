ALTER TABLE "finance_transactions" ADD COLUMN "edited_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "finance_transactions_owner_id_updated_at_idx" ON "finance_transactions" USING btree ("owner_id","updated_at");--> statement-breakpoint
-- Rows saved before sync: their last edit is their last update.
UPDATE "finance_transactions" SET "edited_at" = "updated_at";
