CREATE TABLE "user_records" (
	"owner_id" text NOT NULL,
	"kind" text NOT NULL,
	"id" text NOT NULL,
	"data" jsonb,
	"edited_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_records_owner_id_kind_id_pk" PRIMARY KEY("owner_id","kind","id")
);
--> statement-breakpoint
ALTER TABLE "user_records" ADD CONSTRAINT "user_records_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_records_owner_id_updated_at_idx" ON "user_records" USING btree ("owner_id","updated_at");