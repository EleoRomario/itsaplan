ALTER TABLE "company" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_code_unique" UNIQUE("code");