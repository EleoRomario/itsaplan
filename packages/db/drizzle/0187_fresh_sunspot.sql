CREATE TABLE IF NOT EXISTS "company" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"owner_user_id" text,
	"created_by_user_id" text,
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
CREATE TABLE IF NOT EXISTS "company_attachment" (
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
CREATE TABLE IF NOT EXISTS "company_contact" (
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
CREATE TABLE IF NOT EXISTS "project_form" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"type_id" integer,
	"column_id" integer,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue" ADD COLUMN IF NOT EXISTS "company_id" integer;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "company" ADD CONSTRAINT "company_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "company" ADD CONSTRAINT "company_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "company" ADD CONSTRAINT "company_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "company" ADD CONSTRAINT "company_blacklisted_by_user_id_user_id_fk" FOREIGN KEY ("blacklisted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "company_attachment" ADD CONSTRAINT "company_attachment_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "company_contact" ADD CONSTRAINT "company_contact_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "project_form" ADD CONSTRAINT "project_form_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "project_form" ADD CONSTRAINT "project_form_type_id_issue_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."issue_type"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "project_form" ADD CONSTRAINT "project_form_column_id_project_column_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."project_column"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_tax_id_idx" ON "company" USING btree ("tax_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_name_idx" ON "company" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_team_idx" ON "company" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_owner_idx" ON "company" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_created_by_idx" ON "company" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_attachment_company_idx" ON "company_attachment" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_contact_company_idx" ON "company_contact" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_form_slug_uq" ON "project_form" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_form_project_idx" ON "project_form" USING btree ("project_id");--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "issue" ADD CONSTRAINT "issue_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_company_idx" ON "issue" USING btree ("company_id") WHERE "issue"."company_id" IS NOT NULL;