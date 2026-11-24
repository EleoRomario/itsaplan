ALTER TABLE "initiative" ADD COLUMN "company_id" integer;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "company_id" integer;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "companies_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "initiative" ADD CONSTRAINT "initiative_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "initiative_company_idx" ON "initiative" USING btree ("company_id") WHERE "initiative"."company_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "project_company_idx" ON "project" USING btree ("company_id") WHERE "project"."company_id" IS NOT NULL;