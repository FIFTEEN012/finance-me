CREATE TABLE "finance_store_docs" (
	"owner_id" text NOT NULL,
	"store_key" text NOT NULL,
	"doc_id" text NOT NULL,
	"data" jsonb,
	"deleted" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"server_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_store_docs_owner_id_store_key_doc_id_pk" PRIMARY KEY("owner_id","store_key","doc_id")
);
--> statement-breakpoint
ALTER TABLE "finance_store_docs" ADD CONSTRAINT "finance_store_docs_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;