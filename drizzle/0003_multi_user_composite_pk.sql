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
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_owner_id_id_pk" PRIMARY KEY("owner_id","id");--> statement-breakpoint
INSERT INTO "finance_categories" ("id", "owner_id", "name", "type", "icon", "color", "is_default")
SELECT d.id, u.id, d.name, d.type, d.icon, d.color, true
FROM "user" u
CROSS JOIN (VALUES
    ('cat-income-1', 'เงินเดือน', 'INCOME', 'Briefcase', '#22c55e'),
    ('cat-income-2', 'ธุรกิจ', 'INCOME', 'Store', '#16a34a'),
    ('cat-income-3', 'การลงทุน', 'INCOME', 'TrendingUp', '#15803d'),
    ('cat-income-4', 'รายรับอื่นๆ', 'INCOME', 'PlusCircle', '#86efac'),
    ('cat-expense-1', 'อาหาร', 'EXPENSE', 'Utensils', '#ef4444'),
    ('cat-expense-2', 'เดินทาง', 'EXPENSE', 'Car', '#f97316'),
    ('cat-expense-3', 'ที่พัก', 'EXPENSE', 'Home', '#eab308'),
    ('cat-expense-4', 'สุขภาพ', 'EXPENSE', 'HeartPulse', '#ec4899'),
    ('cat-expense-5', 'ช้อปปิ้ง', 'EXPENSE', 'ShoppingBag', '#8b5cf6'),
    ('cat-expense-6', 'บันเทิง', 'EXPENSE', 'Tv', '#06b6d4'),
    ('cat-expense-7', 'การศึกษา', 'EXPENSE', 'BookOpen', '#3b82f6'),
    ('cat-expense-8', 'สาธารณูปโภค', 'EXPENSE', 'Zap', '#f59e0b'),
    ('cat-expense-9', 'รายจ่ายอื่นๆ', 'EXPENSE', 'MoreHorizontal', '#94a3b8'),
    ('cat-transfer-1', 'ย้ายเงินไปลงทุน', 'TRANSFER', 'ArrowLeftRight', '#0ea5e9')
) AS d(id, name, type, icon, color)
ON CONFLICT ("owner_id", "id") DO NOTHING;
