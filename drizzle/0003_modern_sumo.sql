ALTER TABLE "audit_entries" ADD COLUMN IF NOT EXISTS "location" text;--> statement-breakpoint
ALTER TABLE "audit_entries" ADD COLUMN IF NOT EXISTS "is_trained" boolean DEFAULT false NOT NULL;