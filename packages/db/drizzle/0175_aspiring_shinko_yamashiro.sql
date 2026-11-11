CREATE TABLE "company" (
	"id" serial PRIMARY KEY NOT NULL,
	"tax_id" text NOT NULL,
	"name" text NOT NULL,
	"trade_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"is_blacklisted" boolean DEFAULT false NOT NULL,
	"blacklist_reason" text,
	"blacklisted_at" timestamp with time zone,
	"blacklisted_by_user_id" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"country" text DEFAULT 'PE',
	"website" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_tax_id_unique" UNIQUE("tax_id")
);
--> statement-breakpoint
CREATE TABLE "company_attachment" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"public_id" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"s3_key" text NOT NULL,
	"document_type" text,
	"year" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_attachment_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "company_contact" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"email" text,
	"phone" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_legal_rep" boolean DEFAULT false NOT NULL,
	"document_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue" ADD COLUMN "company_id" integer;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_blacklisted_by_user_id_user_id_fk" FOREIGN KEY ("blacklisted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_attachment" ADD CONSTRAINT "company_attachment_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_contact" ADD CONSTRAINT "company_contact_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_tax_id_idx" ON "company" USING btree ("tax_id");--> statement-breakpoint
CREATE INDEX "company_name_idx" ON "company" USING btree ("name");--> statement-breakpoint
CREATE INDEX "company_attachment_company_idx" ON "company_attachment" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_contact_company_idx" ON "company_contact" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_company_idx" ON "issue" USING btree ("company_id") WHERE "issue"."company_id" IS NOT NULL;