CREATE TABLE "project_form" (
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
ALTER TABLE "project_form" ADD CONSTRAINT "project_form_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_form" ADD CONSTRAINT "project_form_type_id_issue_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."issue_type"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_form" ADD CONSTRAINT "project_form_column_id_project_column_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."project_column"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_form_slug_uq" ON "project_form" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "project_form_project_idx" ON "project_form" USING btree ("project_id");