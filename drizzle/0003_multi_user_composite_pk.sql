-- Key the synced finance tables by (owner_id, id) so two owners can hold the same client id.
ALTER TABLE "finance_budgets" DROP CONSTRAINT "finance_budgets_pkey";--> statement-breakpoint
ALTER TABLE "finance_categories" DROP CONSTRAINT "finance_categories_pkey";--> statement-breakpoint
ALTER TABLE "finance_debts" DROP CONSTRAINT "finance_debts_pkey";--> statement-breakpoint
ALTER TABLE "finance_goals" DROP CONSTRAINT "finance_goals_pkey";--> statement-breakpoint
ALTER TABLE "finance_transactions" DROP CONSTRAINT "finance_transactions_pkey";--> statement-breakpoint
ALTER TABLE "finance_budgets" ADD CONSTRAINT "finance_budgets_owner_id_id_pk" PRIMARY KEY("owner_id","id");--> statement-breakpoint
ALTER TABLE "finance_categories" ADD CONSTRAINT "finance_categories_owner_id_id_pk" PRIMARY KEY("owner_id","id");--> statement-breakpoint
ALTER TABLE "finance_debts" ADD CONSTRAINT "finance_debts_owner_id_id_pk" PRIMARY KEY("owner_id","id");--> statement-breakpoint
ALTER TABLE "finance_goals" ADD CONSTRAINT "finance_goals_owner_id_id_pk" PRIMARY KEY("owner_id","id");--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_owner_id_id_pk" PRIMARY KEY("owner_id","id");
