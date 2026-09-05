ALTER TABLE "meal_logs" DROP CONSTRAINT "meal_logs_calories_positive";--> statement-breakpoint
ALTER TABLE "meal_logs" DROP CONSTRAINT "meal_logs_protein_grams_positive";--> statement-breakpoint
ALTER TABLE "meal_logs" DROP CONSTRAINT "meal_logs_carbs_grams_positive";--> statement-breakpoint
ALTER TABLE "meal_logs" DROP CONSTRAINT "meal_logs_fat_grams_positive";--> statement-breakpoint
ALTER TABLE "meal_logs" DROP CONSTRAINT "meal_logs_cost_positive";--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_calories_nonnegative" CHECK ("meal_logs"."calories" >= 0);--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_protein_grams_nonnegative" CHECK ("meal_logs"."protein_grams" >= 0);--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_carbs_grams_nonnegative" CHECK ("meal_logs"."carbs_grams" >= 0);--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_fat_grams_nonnegative" CHECK ("meal_logs"."fat_grams" >= 0);--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_cost_nonnegative" CHECK ("meal_logs"."cost" >= 0);