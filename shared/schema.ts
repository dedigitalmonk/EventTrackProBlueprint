import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table for basic auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  password_hash: text("password_hash"),
  uuid: text("uuid"),
  email: text("email"),
  role: text("role"),
  parent_id: text("parent_id"),
  active: boolean("active").default(true),
  last_login: text("last_login"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
});

// Events table for storing event information
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(), // Store as ISO string
  startTime: text("start_time"),
  endTime: text("end_time"),
  location: text("location"),
  capacity: integer("capacity").notNull(),
  formId: integer("form_id"),
  createdAt: text("created_at").notNull(), // Store as ISO string
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

// Form schema for customizable registration forms
export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fields: jsonb("fields").notNull(),
  successMessage: text("success_message"),
  showRemainingSpots: boolean("show_remaining_spots").default(true),
  enableWaitlist: boolean("enable_waitlist").default(false),
  requireAllFields: boolean("require_all_fields").default(true),
  themeColor: text("theme_color").default("#3B82F6"),
  buttonStyle: text("button_style").default("rounded"),
  createdAt: text("created_at").notNull(), // Store as ISO string
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
});

// Schema for form field definition
export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum([
    "text",
    "textarea",
    "email",
    "phone",
    "select",
    "checkbox",
    "radio",
    "date",
    "event-select" // New field type for selecting events
  ]),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().default(true),
  options: z.array(z.string()).optional(),
  section: z.string().optional(),
  // Additional properties for event-select field
  eventIds: z.array(z.number()).optional() // For storing specified event IDs
});

export type FormField = z.infer<typeof formFieldSchema>;

// Registrations for events
export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  formData: jsonb("form_data").notNull(),
  status: text("status").default("confirmed"),
  webhookStatus: text("webhook_status").default("not_sent"), // Track webhook delivery status
  attended: boolean("attended").default(false), // Track attendance
  attendanceNotes: text("attendance_notes"), // Optional notes about attendance
  createdAt: text("created_at").notNull(), // Store as ISO string
});

export const insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  createdAt: true,
});

// Webhooks for Zapier integration
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret"),
  events: jsonb("events").notNull(), // Array of event types to trigger webhook
  active: boolean("active").default(true),
  createdAt: text("created_at").notNull(), // Store as ISO string
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
});

// Webhook event types
export const webhookEventTypes = [
  "registration.created",
  "event.created",
  "event.updated",
  "attendance.updated"
] as const;

export const webhookSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(z.enum(webhookEventTypes)),
  active: z.boolean().default(true),
});

// External event schema for receiving events from Zapier
export const externalEventSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  capacity: z.number().int().positive(),
  source: z.string().optional(),
  externalId: z.string().optional(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Form = typeof forms.$inferSelect;
export type InsertForm = z.infer<typeof insertFormSchema>;

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type WebhookEvent = typeof webhookEventTypes[number];
export type ExternalEvent = z.infer<typeof externalEventSchema>;
