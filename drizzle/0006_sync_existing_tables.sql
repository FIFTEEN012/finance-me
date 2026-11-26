ALTER TABLE "finance_budgets" ADD COLUMN "edited_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_budgets" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "finance_categories" ADD COLUMN "edited_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_categories" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "finance_debts" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "finance_debts" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "finance_debts" ADD COLUMN "start_date" text;--> statement-breakpoint
ALTER TABLE "finance_debts" ADD COLUMN "initial_transaction_id" text;--> statement-breakpoint
ALTER TABLE "finance_debts" ADD COLUMN "edited_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_debts" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "finance_goals" ADD COLUMN "milestones_celebrated" jsonb;--> statement-breakpoint
ALTER TABLE "finance_goals" ADD COLUMN "linked_portfolio" boolean;--> statement-breakpoint
ALTER TABLE "finance_goals" ADD COLUMN "edited_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_goals" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "finance_budgets_owner_id_updated_at_idx" ON "finance_budgets" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "finance_categories_owner_id_updated_at_idx" ON "finance_categories" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "finance_debts_owner_id_updated_at_idx" ON "finance_debts" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "finance_goals_owner_id_updated_at_idx" ON "finance_goals" USING btree ("owner_id","updated_at");--> statement-breakpoint
-- Rows saved before sync: their last edit is their last update.
UPDATE "finance_categories" SET "edited_at" = "updated_at";--> statement-breakpoint
UPDATE "finance_budgets" SET "edited_at" = "updated_at";--> statement-breakpoint
UPDATE "finance_goals" SET "edited_at" = "updated_at";--> statement-breakpoint
UPDATE "finance_debts" SET "edited_at" = "updated_at";
