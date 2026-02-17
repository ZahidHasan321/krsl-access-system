CREATE TABLE "attendance_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"entry_time" timestamp NOT NULL,
	"exit_time" timestamp,
	"status" text NOT NULL,
	"verify_method" text,
	"date" text NOT NULL,
	"purpose" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"entry_time" timestamp NOT NULL,
	"exit_time" timestamp,
	"purpose" text,
	"date" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bio_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"template_type" text NOT NULL,
	"template_data" text NOT NULL,
	"fid" text,
	"template_no" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "device_commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_sn" text NOT NULL,
	"command_string" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"serial_number" text NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"last_heartbeat" timestamp,
	"status" text DEFAULT 'offline' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "devices_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category_id" text NOT NULL,
	"code_no" text,
	"card_no" text,
	"biometric_id" text,
	"photo_url" text,
	"enrolled_methods" text,
	"company" text,
	"contact_no" text,
	"designation" text,
	"is_trained" boolean DEFAULT false NOT NULL,
	"join_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "people_code_no_unique" UNIQUE("code_no")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "person_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "person_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "raw_punches" (
	"id" text PRIMARY KEY NOT NULL,
	"device_sn" text NOT NULL,
	"pin" text NOT NULL,
	"punch_time" timestamp NOT NULL,
	"status" integer,
	"verify" integer,
	"raw_line" text NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role_id" text NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"lockout_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_number" text NOT NULL,
	"type" text NOT NULL,
	"vendor_name" text,
	"cargo_description" text,
	"driver_name" text,
	"helper_name" text,
	"mobile" text,
	"note" text,
	"entry_time" timestamp NOT NULL,
	"exit_time" timestamp,
	"status" text NOT NULL,
	"date" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bio_templates" ADD CONSTRAINT "bio_templates_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_device_sn_devices_serial_number_fk" FOREIGN KEY ("device_sn") REFERENCES "public"."devices"("serial_number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_category_id_person_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."person_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_categories" ADD CONSTRAINT "person_categories_parent_id_person_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."person_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_person_id_idx" ON "attendance_logs" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "attendance_status_idx" ON "attendance_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attendance_date_idx" ON "attendance_logs" USING btree ("date");--> statement-breakpoint
CREATE INDEX "attendance_entry_time_idx" ON "attendance_logs" USING btree ("entry_time");--> statement-breakpoint
CREATE INDEX "attendance_person_status_idx" ON "attendance_logs" USING btree ("person_id","status");--> statement-breakpoint
CREATE INDEX "audit_entries_person_id_idx" ON "audit_entries" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "audit_entries_date_idx" ON "audit_entries" USING btree ("date");--> statement-breakpoint
CREATE INDEX "bio_templates_person_id_idx" ON "bio_templates" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "bio_templates_unique_idx" ON "bio_templates" USING btree ("person_id","template_type","fid");--> statement-breakpoint
CREATE INDEX "device_commands_device_sn_idx" ON "device_commands" USING btree ("device_sn");--> statement-breakpoint
CREATE INDEX "device_commands_status_idx" ON "device_commands" USING btree ("status");--> statement-breakpoint
CREATE INDEX "devices_serial_number_idx" ON "devices" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "people_name_idx" ON "people" USING btree ("name");--> statement-breakpoint
CREATE INDEX "people_category_id_idx" ON "people" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "people_code_no_idx" ON "people" USING btree ("code_no");--> statement-breakpoint
CREATE INDEX "people_card_no_idx" ON "people" USING btree ("card_no");--> statement-breakpoint
CREATE INDEX "people_biometric_id_idx" ON "people" USING btree ("biometric_id");--> statement-breakpoint
CREATE INDEX "people_contact_no_idx" ON "people" USING btree ("contact_no");--> statement-breakpoint
CREATE INDEX "people_company_idx" ON "people" USING btree ("company");--> statement-breakpoint
CREATE INDEX "category_parent_id_idx" ON "person_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "category_slug_idx" ON "person_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "raw_punches_device_sn_idx" ON "raw_punches" USING btree ("device_sn");--> statement-breakpoint
CREATE INDEX "raw_punches_pin_idx" ON "raw_punches" USING btree ("pin");--> statement-breakpoint
CREATE INDEX "raw_punches_processed_idx" ON "raw_punches" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "vehicle_num_idx" ON "vehicles" USING btree ("vehicle_number");--> statement-breakpoint
CREATE INDEX "vehicle_status_idx" ON "vehicles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vehicle_date_idx" ON "vehicles" USING btree ("date");--> statement-breakpoint
CREATE INDEX "vehicle_driver_idx" ON "vehicles" USING btree ("driver_name");--> statement-breakpoint
CREATE INDEX "vehicle_vendor_idx" ON "vehicles" USING btree ("vendor_name");--> statement-breakpoint
CREATE INDEX "vehicle_entry_time_idx" ON "vehicles" USING btree ("entry_time");