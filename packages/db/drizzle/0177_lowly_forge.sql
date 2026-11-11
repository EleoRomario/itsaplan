ALTER TABLE "company" ADD COLUMN "team_id" integer;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_team_idx" ON "company" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "company_owner_idx" ON "company" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "company_created_by_idx" ON "company" USING btree ("created_by_user_id");