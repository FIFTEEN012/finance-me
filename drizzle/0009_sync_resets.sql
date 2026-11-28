CREATE TABLE "sync_resets" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sync_resets" ADD CONSTRAINT "sync_resets_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;