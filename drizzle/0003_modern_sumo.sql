ALTER TABLE "audit_entries" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "audit_entries" ADD COLUMN "is_trained" boolean DEFAULT false NOT NULL;