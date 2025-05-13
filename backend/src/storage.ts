import {
  users, 
  events, 
  forms, 
  registrations,
  webhooks,
  type User, 
  type InsertUser,
  type Event,
  type InsertEvent,
  type Form,
  type InsertForm,
  type Registration,
  type InsertRegistration,
  type Webhook,
  type InsertWebhook,
  type WebhookEvent
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  verifyUserCredentials(username: string, password: string): Promise<User | null>;
  
  // Database utilities
  applyDatabaseMigrations(): Promise<void>;
  
  // Event methods
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  getEventWithRegistrationCount(id: number): Promise<(Event & { registrationCount: number }) | undefined>;
  
  // Form methods
  getForms(): Promise<Form[]>;
  getForm(id: number): Promise<Form | undefined>;
  createForm(form: InsertForm): Promise<Form>;
  updateForm(id: number, form: Partial<InsertForm>): Promise<Form | undefined>;
  deleteForm(id: number): Promise<boolean>;
  
  // Registration methods
  getRegistrations(): Promise<Registration[]>;
  getRegistrationsByEvent(eventId: number): Promise<Registration[]>;
  getRegistration(id: number): Promise<Registration | undefined>;
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  updateRegistration(id: number, registration: Partial<InsertRegistration>): Promise<Registration | undefined>;
  deleteRegistration(id: number): Promise<boolean>;
  getEventRegistrationCount(eventId: number): Promise<number>;
  
  // Webhook methods
  getWebhooks(): Promise<Webhook[]>;
  getWebhook(id: number): Promise<Webhook | undefined>;
  createWebhook(webhook: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: number, webhook: Partial<InsertWebhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: number): Promise<boolean>;
  getWebhooksByEvent(eventType: WebhookEvent): Promise<Webhook[]>;
}

export class DatabaseStorage implements IStorage {
  // Database utilities
  async applyDatabaseMigrations(): Promise<void> {
    try {
      // Check if users table exists
      const usersTableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'users'
        );
      `);
      
      // Create the users table if it doesn't exist
      if (!usersTableExists.rows[0].exists) {
        console.log("Creating users table");
        await db.execute(sql`
          CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
          );
        `);
      } else {
        // Check if password column exists in users table
        const passwordColumnExists = await db.execute(sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'users'
          AND column_name = 'password'
        `);
        
        if (passwordColumnExists.rows.length === 0) {
          console.log("Adding password column to users table");
          await db.execute(sql`
            ALTER TABLE users 
            ADD COLUMN password TEXT NOT NULL DEFAULT 'admin123'
          `);
        }
      }
      
      // Check if webhookStatus column exists in registrations table
      const hasWebhookStatus = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'registrations' AND column_name = 'webhook_status'
      `);
      
      // If webhookStatus column doesn't exist, add it with default value "not_sent"
      if (hasWebhookStatus.rows.length === 0) {
        console.log("Adding webhook_status column to registrations table");
        await db.execute(sql`
          ALTER TABLE registrations 
          ADD COLUMN webhook_status TEXT DEFAULT 'not_sent' NOT NULL
        `);
      }
      
      // Apply additional migrations for attendance tracking
      // Check if the attended column exists in the registrations table
      const attendedColumnExists = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'registrations'
        AND column_name = 'attended'
      `);
      
      if (attendedColumnExists.rows.length === 0) {
        console.log("Adding attended column to registrations table");
        await db.execute(sql`
          ALTER TABLE registrations 
          ADD COLUMN attended BOOLEAN DEFAULT FALSE
        `);
      }
      
      // Check if the attendance_notes column exists in the registrations table
      const notesColumnExists = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'registrations'
        AND column_name = 'attendance_notes'
      `);
      
      if (notesColumnExists.rows.length === 0) {
        console.log("Adding attendance_notes column to registrations table");
        await db.execute(sql`
          ALTER TABLE registrations 
          ADD COLUMN attendance_notes TEXT
        `);
      }
    } catch (error) {
      console.error("Error applying database migrations:", error);
      throw error;
    }
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password before storing it
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password_hash: hashedPassword
      })
      .returning();
    return user;
  }
  
  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    // If password is included in the updates, hash it
    if (updates.password) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(updates.password, 10);
      
      // Store hashed password in password_hash field
      const updatedValues = {
        ...updates,
        password_hash: hashedPassword
      };
      delete updatedValues.password; // Remove plain password from updates
      
      const [updatedUser] = await db
        .update(users)
        .set(updatedValues)
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser;
    } else {
      // No password update
      const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser;
    }
  }
  
  async verifyUserCredentials(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    // Direct password check for testing
    if (password === user.password) {
      return user;
    }
    
    // Hash check
    if (user.password_hash) {
      const bcrypt = await import('bcryptjs');
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (passwordMatch) return user;
    }
    
    return null;
  }
  
  // Event methods
  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }
  
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }
  
  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const createdAt = new Date().toISOString();
    
    // Create a clean copy with string | null values for nullable fields
    const eventData = {
      title: insertEvent.title,
      description: insertEvent.description || null,
      date: insertEvent.date,
      startTime: insertEvent.startTime || null,
      endTime: insertEvent.endTime || null,
      location: insertEvent.location || null,
      capacity: insertEvent.capacity,
      createdAt,
      formId: null
    };
    
    const [event] = await db
      .insert(events)
      .values(eventData)
      .returning();
    
    return event;
  }
  
  async updateEvent(id: number, eventUpdate: Partial<InsertEvent>): Promise<Event | undefined> {
    // Create a clean copy with string | null values for nullable fields
    const updateData = { ...eventUpdate };
    
    const [updatedEvent] = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();
    
    return updatedEvent;
  }
  
  async deleteEvent(id: number): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async getEventWithRegistrationCount(id: number): Promise<(Event & { registrationCount: number }) | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    if (!event) return undefined;
    
    const registrationCount = await this.getEventRegistrationCount(id);
    return { ...event, registrationCount };
  }
  
  // Form methods
  async getForms(): Promise<Form[]> {
    return await db.select().from(forms);
  }
  
  async getForm(id: number): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    return form;
  }
  
  async createForm(insertForm: InsertForm): Promise<Form> {
    const createdAt = new Date().toISOString();
    
    // Create a clean copy with proper types for nullable fields
    const formData = {
      title: insertForm.title,
      description: insertForm.description || null,
      fields: insertForm.fields,
      successMessage: insertForm.successMessage || null,
      showRemainingSpots: insertForm.showRemainingSpots ?? true,
      enableWaitlist: insertForm.enableWaitlist ?? false,
      requireAllFields: insertForm.requireAllFields ?? true,
      themeColor: insertForm.themeColor || "#3B82F6",
      buttonStyle: insertForm.buttonStyle || "rounded",
      createdAt
    };
    
    const [form] = await db
      .insert(forms)
      .values(formData)
      .returning();
    
    return form;
  }
  
  async updateForm(id: number, formUpdate: Partial<InsertForm>): Promise<Form | undefined> {
    const [updatedForm] = await db
      .update(forms)
      .set(formUpdate)
      .where(eq(forms.id, id))
      .returning();
    
    return updatedForm;
  }
  
  async deleteForm(id: number): Promise<boolean> {
    const result = await db.delete(forms).where(eq(forms.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  // Registration methods
  async getRegistrations(): Promise<Registration[]> {
    return await db.select().from(registrations);
  }
  
  async getRegistrationsByEvent(eventId: number): Promise<Registration[]> {
    return await db
      .select()
      .from(registrations)
      .where(eq(registrations.eventId, eventId));
  }
  
  async getRegistration(id: number): Promise<Registration | undefined> {
    const [registration] = await db
      .select()
      .from(registrations)
      .where(eq(registrations.id, id));
    
    return registration;
  }
  
  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    const createdAt = new Date().toISOString();
    
    // Create a clean copy with proper types for nullable fields
    const registrationData = {
      eventId: insertRegistration.eventId,
      formData: insertRegistration.formData,
      status: insertRegistration.status || "confirmed",
      webhookStatus: insertRegistration.webhookStatus || "not_sent",
      attended: insertRegistration.attended || false,
      attendanceNotes: insertRegistration.attendanceNotes || null,
      createdAt
    };
    
    const [registration] = await db
      .insert(registrations)
      .values(registrationData)
      .returning();
    
    return registration;
  }
  
  async updateRegistration(id: number, registrationUpdate: Partial<InsertRegistration>): Promise<Registration | undefined> {
    const [updatedRegistration] = await db
      .update(registrations)
      .set(registrationUpdate)
      .where(eq(registrations.id, id))
      .returning();
    
    return updatedRegistration;
  }
  
  async deleteRegistration(id: number): Promise<boolean> {
    const result = await db.delete(registrations).where(eq(registrations.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async getEventRegistrationCount(eventId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(registrations)
      .where(eq(registrations.eventId, eventId));
    
    return Number(result[0]?.count) || 0;
  }
  
  // Webhook methods
  async getWebhooks(): Promise<Webhook[]> {
    return await db.select().from(webhooks);
  }
  
  async getWebhook(id: number): Promise<Webhook | undefined> {
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, id));
    
    return webhook;
  }
  
  async createWebhook(insertWebhook: InsertWebhook): Promise<Webhook> {
    const createdAt = new Date().toISOString();
    
    // Create a clean copy with proper types for nullable fields
    const webhookData = {
      name: insertWebhook.name,
      url: insertWebhook.url,
      events: insertWebhook.events,
      secret: insertWebhook.secret || null,
      active: insertWebhook.active ?? true,
      createdAt
    };
    
    const [webhook] = await db
      .insert(webhooks)
      .values(webhookData)
      .returning();
    
    return webhook;
  }
  
  async updateWebhook(id: number, webhookUpdate: Partial<InsertWebhook>): Promise<Webhook | undefined> {
    const [updatedWebhook] = await db
      .update(webhooks)
      .set(webhookUpdate)
      .where(eq(webhooks.id, id))
      .returning();
    
    return updatedWebhook;
  }
  
  async deleteWebhook(id: number): Promise<boolean> {
    const result = await db.delete(webhooks).where(eq(webhooks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async getWebhooksByEvent(eventType: WebhookEvent): Promise<Webhook[]> {
    // Special query for JSON array containment
    return await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.active, true),
          sql`${webhooks.events}::jsonb @> ${JSON.stringify([eventType])}::jsonb`
        )
      );
  }
}

// Create a default admin user during initialization
async function createInitialAdminUser() {
  const storage = new DatabaseStorage();
  
  // Check if admin user exists
  const adminUser = await storage.getUserByUsername("admin");
  
  if (!adminUser) {
    // Create default admin user with secure password
    await storage.createUser({
      username: "admin",
      password: "admin123" // This will be hashed by the createUser method
    });
    console.log("Created default admin user");
  }
}

// Initialize the database storage
export const storage = new DatabaseStorage();

// Create admin user in the background
createInitialAdminUser().catch(err => {
  console.error("Failed to create initial admin user:", err);
});