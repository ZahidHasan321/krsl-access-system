ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_person_id_people_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_entries" DROP CONSTRAINT "audit_entries_person_id_people_id_fk";
--> statement-breakpoint
DROP INDEX "bio_templates_unique_idx";--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bio_templates_unique_idx" ON "bio_templates" USING btree ("person_id","template_type","fid","template_no");