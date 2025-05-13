import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import crypto from "crypto";
import session from "express-session";
import { storage } from "./storage";
import { 
  insertEventSchema, 
  insertFormSchema, 
  insertRegistrationSchema,
  formFieldSchema,
  webhookSchema,
  externalEventSchema,
  WebhookEvent,
  type Event,
  type Registration
} from "@shared/schema";
import { z } from "zod";
// Use native fetch for Node.js environments
import fetch from "node-fetch";

// Extend Express Session with our custom properties
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

/**
 * Field ID to label mapping for form fields
 * Used to properly extract and name fields in webhook payloads
 */
const FORM_FIELD_LABELS: Record<string, string> = {
  "4a2b99cf-7244-4e93-8f29-2e02c6845960": "First Name",
  "50592742-6389-40ea-8a85-c4291e99f545": "Last Name", 
  "5a2aa210-8c3d-485e-878b-0c8dceb0f9bc": "Email",
  "7a006b3a-6516-4981-a333-e92b98970f29": "Phone",
  "156e810e-d049-4f37-98a9-3763abdb7386": "Tell me a bit about yourself",
  "7d903ce3-3998-4c37-94f9-8d0257b8d279": "What do you do for work?",
  "4c72cf83-105b-4cbd-bc9b-dd4f099493a9": "Are you familiar with Notion?",
  "7d8d5ace-d95e-4dab-bb71-ac8bf272c572": "What is your main currency",
  "41bf2047-cd0b-41f2-ad7c-4d7bb462ab44": "Select event"
};

/**
 * Helper function to extract standard fields from form data
 * Maps UUIDs to human-readable field names and extracts essential contact info
 */
function extractStandardFields(formData: Record<string, any>) {
  // Log the raw form data keys for debugging
  console.log("Form data keys:", Object.keys(formData));
  
  // Initialize with default values
  let firstName = "";
  let lastName = "";
  let email = "";
  
  // Process each field in the form data
  Object.entries(formData).forEach(([key, value]) => {
    // Clean up key format to match our mapping (add dashes if needed)
    // Form IDs are stored without dashes in the formData
    const cleanedKey = key.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');
    
    // Get the field label if it exists in our mapping
    const fieldLabel = FORM_FIELD_LABELS[cleanedKey] || FORM_FIELD_LABELS[key];
    
    // Set our standard fields based on known field labels
    if (fieldLabel === "First Name") {
      firstName = String(value);
    } 
    else if (fieldLabel === "Last Name") {
      lastName = String(value);
    }
    else if (fieldLabel === "Email") {
      email = String(value);
    }
  });
  
  console.log("Extracted standard fields:", { firstName, lastName, email });
  return { firstName, lastName, email };
}

/**
 * Extract participant name from form data
 * Used for attendance tracking and webhook payloads
 */
function extractParticipantName(formData: Record<string, any>) {
  if (!formData || typeof formData !== 'object') {
    return 'Unknown Participant';
  }
  
  // Extract standard fields first
  const { firstName, lastName } = extractStandardFields(formData);
  
  // Build full name from firstName and lastName
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }
  
  // If no standard fields, try to find any field with "name" in it
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string' && 
       (key.toLowerCase().includes('name') || 
        key.toLowerCase() === 'fullname' || 
        key.toLowerCase() === 'full_name' ||
        key.toLowerCase() === 'participant')) {
      return value;
    }
  }
  
  // Fallback to Unknown Participant
  return 'Unknown Participant';
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust the first proxy in production for secure cookies
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  
  // Set up in-memory session handling
  app.use(session({
    secret: process.env.SESSION_SECRET || 'event-management-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      // In production, allow secure cookies to be sent in HTTPS requests only
      secure: process.env.NODE_ENV === 'production' ? 'auto' : false,
      // Add sameSite setting for better cookie security in production
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict'
    }
  }));
  
  // Authentication middleware to protect routes
  function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.userId) {
      next();
    } else {
      res.status(401).json({ message: 'Authentication required' });
    }
  }
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    try {
      const user = await storage.verifyUserCredentials(username, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Set user session
      req.session.userId = user.id;
      
      // Return user info (except password)
      const { password: _, ...userInfo } = user;
      res.json({ user: userInfo });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "An error occurred during login" });
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }
      
      // Return user info (except password)
      const { password_hash, ...userInfo } = user;
      res.json({ user: userInfo });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });
  
  app.put("/api/auth/account", requireAuth, async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    
    try {
      // Get current user
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If changing password, verify current password
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required to set a new password" });
        }
        
        const bcrypt = await import('bcryptjs');
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        
        if (!passwordMatch) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }
      
      // Update user info
      const updates: Partial<{ username: string, password: string }> = {};
      if (username && username !== user.username) {
        updates.username = username;
      }
      
      if (newPassword) {
        updates.password = newPassword;
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No changes provided" });
      }
      
      // Update user in database
      const updatedUser = await storage.updateUser(user.id, updates);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      // Return updated user info (except password)
      const { password: _, ...userInfo } = updatedUser;
      res.json(userInfo);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user data" });
    }
  });
  
  // Helper function to validate request body
  function validateBody<T extends z.ZodTypeAny>(
    schema: T,
    req: Request,
    res: Response
  ): z.infer<T> | null {
    try {
      return schema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      } else {
        res.status(400).json({ message: "Invalid request body" });
      }
      return null;
    }
  }

  // EVENT ROUTES
  app.get("/api/events", async (_req, res) => {
    try {
      const events = await storage.getEvents();
      const eventsWithCounts = await Promise.all(
        events.map(async (event) => {
          const count = await storage.getEventRegistrationCount(event.id);
          return { ...event, registrationCount: count };
        })
      );
      res.json(eventsWithCounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Get single event
  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const event = await storage.getEventWithRegistrationCount(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Create event
  app.post("/api/events", requireAuth, async (req, res) => {
    const validatedData = validateBody(insertEventSchema, req, res);
    if (!validatedData) return;

    try {
      const event = await storage.createEvent(validatedData);
      
      // Trigger webhooks for event creation
      try {
        await triggerWebhooks("event.created", event);
      } catch (error) {
        console.error("Error triggering webhook for event creation:", error);
      }
      
      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Update event
  app.put("/api/events/:id", requireAuth, async (req, res) => {
    const validatedData = validateBody(insertEventSchema.partial(), req, res);
    if (!validatedData) return;

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const event = await storage.updateEvent(id, validatedData);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // Delete event
  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const success = await storage.deleteEvent(id);
      if (!success) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Link form to event
  app.post("/api/events/:eventId/form/:formId", requireAuth, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const formId = parseInt(req.params.formId);
      
      if (isNaN(eventId) || isNaN(formId)) {
        return res.status(400).json({ message: "Invalid ID parameters" });
      }

      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const updatedEvent = await storage.updateEvent(eventId, { ...event });
      res.json(updatedEvent);
    } catch (error) {
      res.status(500).json({ message: "Failed to link form to event" });
    }
  });

  // FORM ROUTES
  // Get all forms
  app.get("/api/forms", async (_req, res) => {
    try {
      const forms = await storage.getForms();
      res.json(forms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch forms" });
    }
  });

  // Get single form
  app.get("/api/forms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }

      const form = await storage.getForm(id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      res.json(form);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  // Create form
  app.post("/api/forms", requireAuth, async (req, res) => {
    // Validate fields array
    if (req.body.fields) {
      try {
        const fieldsArray = z.array(formFieldSchema).parse(req.body.fields);
        req.body.fields = fieldsArray;
      } catch (error) {
        return res.status(400).json({ 
          message: "Invalid form fields", 
          error: error instanceof z.ZodError ? error.errors : error 
        });
      }
    }

    const validatedData = validateBody(insertFormSchema, req, res);
    if (!validatedData) return;

    try {
      const form = await storage.createForm(validatedData);
      res.status(201).json(form);
    } catch (error) {
      res.status(500).json({ message: "Failed to create form" });
    }
  });

  // Update form
  app.put("/api/forms/:id", requireAuth, async (req, res) => {
    // Validate fields array if present
    if (req.body.fields) {
      try {
        const fieldsArray = z.array(formFieldSchema).parse(req.body.fields);
        req.body.fields = fieldsArray;
      } catch (error) {
        return res.status(400).json({ 
          message: "Invalid form fields", 
          error: error instanceof z.ZodError ? error.errors : error 
        });
      }
    }

    const validatedData = validateBody(insertFormSchema.partial(), req, res);
    if (!validatedData) return;

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }

      const form = await storage.updateForm(id, validatedData);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      res.json(form);
    } catch (error) {
      res.status(500).json({ message: "Failed to update form" });
    }
  });

  // Delete form
  app.delete("/api/forms/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }

      const success = await storage.deleteForm(id);
      if (!success) {
        return res.status(404).json({ message: "Form not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete form" });
    }
  });

  // REGISTRATION ROUTES
  // Get all registrations
  app.get("/api/registrations", requireAuth, async (_req, res) => {
    try {
      const registrations = await storage.getRegistrations();
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  // Get registrations for an event
  app.get("/api/events/:eventId/registrations", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const registrations = await storage.getRegistrationsByEvent(eventId);
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  // Create registration
  app.post("/api/registrations", async (req, res) => {
    const validatedData = validateBody(insertRegistrationSchema, req, res);
    if (!validatedData) return;

    try {
      // Check if the event exists and has capacity
      const eventId = validatedData.eventId;
      const eventInfo = await storage.getEvent(eventId);
      
      if (!eventInfo) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check event capacity
      const registrationCount = await storage.getEventRegistrationCount(eventId);
      if (registrationCount >= eventInfo.capacity) {
        return res.status(400).json({ message: "Event is at full capacity" });
      }

      const registration = await storage.createRegistration(validatedData);
      
      // Get the event details to include in the webhook payload
      const eventDataForWebhook = await storage.getEvent(registration.eventId);
      
      // Extract registration fields from form data
      const formData = registration.formData as Record<string, any>;
      
      // Find common registration fields in the form data
      let firstName = "";
      let lastName = "";
      let email = "";
      
      // Look for common field names in the form data
      Object.entries(formData).forEach(([key, value]) => {
        const keyLower = key.toLowerCase();
        
        // Skip eventName as it's handled separately
        if (key === 'eventName') return;
        
        // Look for name fields
        if (keyLower.includes('first') || keyLower.includes('fname')) {
          firstName = String(value);
        }
        else if (keyLower.includes('last') || keyLower.includes('lname')) {
          lastName = String(value);
        }
        else if (keyLower === 'name' || keyLower === 'fullname') {
          // If we find a full name field and don't have first/last yet, try to split it
          if (!firstName && !lastName && typeof value === 'string') {
            const nameParts = value.split(' ');
            if (nameParts.length > 1) {
              firstName = nameParts[0];
              lastName = nameParts.slice(1).join(' ');
            } else {
              firstName = value;
            }
          }
        }
        // Look for email field
        else if (keyLower.includes('email')) {
          email = String(value);
        }
      });
      
      // Get event details if they exist
      const eventTitle = eventDataForWebhook?.title || 'Unknown Event';
      const eventDescription = eventDataForWebhook?.description || '';
      const eventDate = eventDataForWebhook?.date || '';
      const eventLocation = eventDataForWebhook?.location || '';
      const eventStartTime = eventDataForWebhook?.startTime || '';
      const eventEndTime = eventDataForWebhook?.endTime || '';
      const eventCapacity = eventDataForWebhook?.capacity || 0;
      
      // For Zapier, use a standard format with snake_case fields and field labels
      // Start with base payload including event details
      let webhookPayload: Record<string, any> = {
        // Event details
        event_title: eventTitle,
        event_description: eventDescription,
        event_date: eventDate,
        event_location: eventLocation,
        event_start_time: eventStartTime,
        event_end_time: eventEndTime,
        event_capacity: eventCapacity,
        
        // Registration details from extracted fields
        first_name: firstName,
        last_name: lastName,
        email: email,
        
        // Additional metadata
        registration_id: registration.id,
        registration_status: registration.status,
        webhook_status: registration.webhookStatus || "pending",
        submitted_at: registration.createdAt
      };
      
      // Add all form data fields to the payload with proper field names
      // This ensures all form fields are sent to Zapier as individual fields with human-readable names
      if (registration.formData && typeof registration.formData === 'object') {
        Object.entries(registration.formData).forEach(([key, value]) => {
          // Clean up key format to match our mapping (add dashes if needed)
          // Form IDs are stored without dashes in the formData
          const cleanedKey = key.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');
          
          // Look for the label in our mapping
          const fieldLabel = FORM_FIELD_LABELS[cleanedKey] || 
                             // If not found, see if key matches a UUID pattern without dashes
                             FORM_FIELD_LABELS[key] || 
                             // Last resort, use the raw key
                             key;
          
          // Convert the field label to snake_case for Zapier
          const snakeCaseLabel = fieldLabel
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
          
          // Add to the payload
          webhookPayload[snakeCaseLabel] = value;
          
          // For backward compatibility and debugging, also add with form_ prefix
          webhookPayload[`form_${key}`] = value;
          
          // Explicitly set first_name, last_name, email from known fields for Zapier
          if (fieldLabel === "First Name") {
            webhookPayload.first_name = String(value);
          } 
          else if (fieldLabel === "Last Name") {
            webhookPayload.last_name = String(value);
          }
          else if (fieldLabel === "Email") {
            webhookPayload.email = String(value);
          }
        });
      }
      
      // Log the webhook payload for debugging
      console.log(`Auto webhook payload: ${JSON.stringify(webhookPayload)}`);
      
      // Trigger webhooks for registration creation
      try {
        console.log("Triggering webhooks for registration.created event");
        const success = await triggerWebhooks("registration.created", webhookPayload);
        
        // Update the registration's webhook status
        if (success) {
          await storage.updateRegistration(registration.id, { webhookStatus: "sent" });
        }
      } catch (error) {
        console.error("Error triggering webhook:", error);
        // Non-fatal error, continue with response
      }
      
      res.status(201).json(registration);
    } catch (error) {
      res.status(500).json({ message: "Failed to create registration" });
    }
  });

  // Update registration
  app.put("/api/registrations/:id", async (req, res) => {
    const validatedData = validateBody(insertRegistrationSchema.partial(), req, res);
    if (!validatedData) return;

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid registration ID" });
      }

      const registration = await storage.updateRegistration(id, validatedData);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      res.json(registration);
    } catch (error) {
      res.status(500).json({ message: "Failed to update registration" });
    }
  });
  
  // Patch registration (for partial updates like webhook status and attendance)
  app.patch("/api/registrations/:id", async (req, res) => {
    const validatedData = validateBody(insertRegistrationSchema.partial(), req, res);
    if (!validatedData) return;

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid registration ID" });
      }

      const registration = await storage.updateRegistration(id, validatedData);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      // If attendance was updated, trigger attendance.updated webhook
      if ('attended' in req.body) {
        try {
          // Get the event details
          const event = await storage.getEvent(registration.eventId);
          if (event) {
            // Extract participant name from registration form data
            const participantName = extractParticipantName(registration.formData as Record<string, any>);
            
            // Trigger webhook for attendance update
            await triggerWebhooks('attendance.updated', {
              event_id: event.id,
              event_title: event.title,
              registration_id: registration.id,
              participant_name: participantName,
              attended: registration.attended,
              attendance_notes: registration.attendanceNotes || '',
              updated_at: new Date().toISOString()
            });
          }
        } catch (webhookError) {
          console.error('Error triggering attendance webhook:', webhookError);
          // Continue processing - don't fail the request if webhook fails
        }
      }

      res.json(registration);
    } catch (error) {
      console.error('Error updating registration:', error);
      res.status(500).json({ message: "Failed to update registration" });
    }
  });

  // Delete registration
  app.delete("/api/registrations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid registration ID" });
      }

      const success = await storage.deleteRegistration(id);
      if (!success) {
        return res.status(404).json({ message: "Registration not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete registration" });
    }
  });
  
  // Manually trigger webhook for a registration
  app.post("/api/registrations/:id/webhook", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid registration ID" });
      }

      // Get the registration
      const registration = await storage.getRegistration(id);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      // Get the event details
      const eventDetails = await storage.getEvent(registration.eventId);
      if (!eventDetails) {
        return res.status(404).json({ message: "Associated event not found" });
      }
      
      // Extract registration fields from form data
      const formData = registration.formData as Record<string, any>;
      
      // Find common registration fields in the form data
      let firstName = "";
      let lastName = "";
      let email = "";
      
      // Look for common field names in the form data
      Object.entries(formData).forEach(([key, value]) => {
        const keyLower = key.toLowerCase();
        
        // Skip eventName as it's handled separately
        if (key === 'eventName') return;
        
        // Look for name fields
        if (keyLower.includes('first') || keyLower.includes('fname')) {
          firstName = String(value);
        }
        else if (keyLower.includes('last') || keyLower.includes('lname')) {
          lastName = String(value);
        }
        else if (keyLower === 'name' || keyLower === 'fullname') {
          // If we find a full name field and don't have first/last yet, try to split it
          if (!firstName && !lastName && typeof value === 'string') {
            const nameParts = value.split(' ');
            if (nameParts.length > 1) {
              firstName = nameParts[0];
              lastName = nameParts.slice(1).join(' ');
            } else {
              firstName = value;
            }
          }
        }
        // Look for email field
        else if (keyLower.includes('email')) {
          email = String(value);
        }
      });
      
      // Get the form field labels from the console logs we saw earlier
      const FORM_FIELD_LABELS: Record<string, string> = {
        "4a2b99cf-7244-4e93-8f29-2e02c6845960": "First Name",
        "50592742-6389-40ea-8a85-c4291e99f545": "Last Name",
        "5a2aa210-8c3d-485e-878b-0c8dceb0f9bc": "Email",
        "7a006b3a-6516-4981-a333-e92b98970f29": "Phone",
        "156e810e-d049-4f37-98a9-3763abdb7386": "Tell me a bit about yourself",
        "7d903ce3-3998-4c37-94f9-8d0257b8d279": "What do you do for work?",
        "4c72cf83-105b-4cbd-bc9b-dd4f099493a9": "Are you familiar with Notion?",
        "7d8d5ace-d95e-4dab-bb71-ac8bf272c572": "What is your main currency",
        "41bf2047-cd0b-41f2-ad7c-4d7bb462ab44": "Select event"
      };

      // Start with base payload including event details
      let webhookPayload: Record<string, any> = {
        // Event details
        event_title: eventDetails.title || 'Unknown Event',
        event_description: eventDetails.description || '',
        event_date: eventDetails.date || '',
        event_location: eventDetails.location || '',
        event_start_time: eventDetails.startTime || '',
        event_end_time: eventDetails.endTime || '',
        event_capacity: eventDetails.capacity || 0,
        
        // Manual trigger metadata
        manually_triggered: true,
        triggered_at: new Date().toISOString(),
        
        // Common metadata fields
        registration_id: registration.id,
        registration_status: registration.status,
        webhook_status: registration.webhookStatus || "pending",
        submitted_at: registration.createdAt
      };
      
      // Get the raw form data keys for logging
      console.log("Raw form data keys:", Object.keys(formData));
      
      // First, extract the form data with proper field names
      if (registration.formData && typeof registration.formData === 'object') {
        Object.entries(registration.formData).forEach(([key, value]) => {
          // Clean up the form field ID to match our lookup table
          // Form IDs are stored without dashes in the formData
          const cleanedKey = key.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');
          
          // Look for the label in our mapping
          const fieldLabel = FORM_FIELD_LABELS[cleanedKey] || 
                             // If not found, see if key matches a UUID pattern without dashes
                             FORM_FIELD_LABELS[key] || 
                             // Last resort, use the raw key
                             key;
          
          // Convert the field label to snake_case for Zapier
          const snakeCaseLabel = fieldLabel
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
          
          // Add to the payload
          webhookPayload[snakeCaseLabel] = value;
          
          // Explicitly set first_name, last_name, email from known fields for Zapier
          if (fieldLabel === "First Name") {
            webhookPayload.first_name = String(value);
          } 
          else if (fieldLabel === "Last Name") {
            webhookPayload.last_name = String(value);
          }
          else if (fieldLabel === "Email") {
            webhookPayload.email = String(value);
          }
        });
      }
      
      // Log the webhook payload for debugging
      console.log(`Manual webhook payload: ${JSON.stringify(webhookPayload)}`);
      
      // Trigger webhooks for this registration
      try {
        console.log(`Manually triggering webhook for registration ${id}`);
        const success = await triggerWebhooks("registration.created", webhookPayload);
        
        // Update the webhook status on success
        if (success) {
          await storage.updateRegistration(id, { webhookStatus: "sent" });
          res.status(200).json({ 
            message: "Webhook triggered successfully", 
            webhookStatus: "sent" 
          });
        } else {
          res.status(200).json({ 
            message: "No webhooks were triggered", 
            webhookStatus: registration.webhookStatus 
          });
        }
      } catch (error) {
        console.error("Error triggering webhook:", error);
        res.status(500).json({ message: "Failed to trigger webhook" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // Add a new route for manually triggering webhooks
  app.post("/api/webhooks/trigger", async (req, res) => {
    try {
      const { eventType, eventId, data } = req.body;
      
      if (!eventType || !eventType.match(/^[a-z]+\.[a-z]+$/)) {
        return res.status(400).json({ message: "Invalid event type" });
      }
      
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ message: "Invalid payload data" });
      }
      
      // Add additional metadata
      const enrichedData = {
        ...data,
        triggered_at: new Date().toISOString(),
        manual_trigger: true
      };
      
      // Trigger the webhook
      const success = await triggerWebhooks(eventType as WebhookEvent, enrichedData);
      
      if (success) {
        res.status(200).json({ message: "Webhook triggered successfully" });
      } else {
        res.status(200).json({ message: "No webhooks were triggered" });
      }
    } catch (error) {
      console.error("Error triggering webhook:", error);
      res.status(500).json({ message: "Failed to trigger webhook" });
    }
  });
  
  // Test a specific webhook
  // Send event to all webhooks subscribed to event.created
  app.post("/api/webhooks/test-event", async (req, res) => {
    try {
      const { eventId } = req.body;
      
      if (!eventId) {
        return res.status(400).json({ message: "Missing eventId in request body" });
      }
      
      // Get the event with registration count
      const event = await storage.getEventWithRegistrationCount(parseInt(eventId));
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Trigger webhooks for event.created event
      await triggerWebhooks("event.created", {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location,
        is_online: !event.location || event.location.toLowerCase() === "online",
        capacity: event.capacity,
        registrations_count: event.registrationCount,
        available_spots: Math.max(0, event.capacity - event.registrationCount),
        event_url: `${req.protocol}://${req.get('host')}/events/${event.id}`,
        created_at: new Date().toISOString(),
        start_time: event.startTime || null,
        end_time: event.endTime || null
      });
      
      return res.json({ success: true, message: "Event webhook triggered successfully" });
    } catch (error) {
      console.error("Error triggering event webhook:", error);
      return res.status(500).json({ message: "Failed to trigger event webhook" });
    }
  });

  app.post("/api/webhooks/test", async (req, res) => {
    try {
      const { webhookId, eventType, data } = req.body;
      
      if (!webhookId || !eventType || !data) {
        return res.status(400).json({ message: "Missing required fields: webhookId, eventType, data" });
      }
      
      // Get the webhook
      const webhook = await storage.getWebhook(webhookId);
      
      if (!webhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }
      
      if (!webhook.active) {
        return res.status(400).json({ message: "Cannot test inactive webhook" });
      }
      
      // Prepare webhook payload
      const payload = {
        event_type: eventType,
        test: true,
        timestamp: new Date().toISOString(),
        ...data
      };
      
      try {
        // Create a signature if the webhook has a secret
        let headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (webhook.secret) {
          const signature = crypto
            .createHmac('sha256', webhook.secret)
            .update(JSON.stringify(payload))
            .digest('hex');
          
          headers['X-Webhook-Signature'] = signature;
        }
        
        // Send the payload to the webhook URL
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        
        const statusCode = response.status;
        let responseText;
        
        try {
          responseText = await response.text();
        } catch (err) {
          responseText = 'Unable to read response';
        }
        
        return res.json({
          success: statusCode >= 200 && statusCode < 300,
          statusCode,
          response: responseText.slice(0, 1000), // Limit response text size
          webhook: {
            id: webhook.id,
            name: webhook.name,
            url: webhook.url
          }
        });
      } catch (fetchError: any) {
        console.error('Error sending test webhook:', fetchError);
        return res.status(400).json({
          success: false,
          error: `Failed to send webhook: ${fetchError.message || 'Unknown error'}`,
          webhook: {
            id: webhook.id,
            name: webhook.name,
            url: webhook.url
          }
        });
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // WEBHOOK ROUTES
  // Function to trigger webhooks
  async function triggerWebhooks(eventType: WebhookEvent, payload: any): Promise<boolean> {
    try {
      const webhooks = await storage.getWebhooksByEvent(eventType);
      
      // No webhooks to trigger
      if (webhooks.length === 0) return false;
      
      // Send payload to each registered webhook
      const promises = webhooks.map(async (webhook) => {
        try {
          // If webhook has a secret, create a signature
          let headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          
          if (webhook.secret) {
            const signature = crypto
              .createHmac('sha256', webhook.secret)
              .update(JSON.stringify(payload))
              .digest('hex');
            
            headers['X-Webhook-Signature'] = signature;
          }
          
          // Send the webhook request with exactly the expected format
          // Ensure Content-Type is explicitly set to application/json
          headers['Content-Type'] = 'application/json';
          
          // Convert payload to a simple JSON string without any wrapping
          const jsonPayload = JSON.stringify(payload);
          console.log(`Sending webhook payload: ${jsonPayload}`);
          
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: headers,
            body: jsonPayload // Direct JSON string
          });
          
          if (!response.ok) {
            throw new Error(`Failed to send data to webhook: ${response.status}`);
          }
          
          const result = await response.text();
          console.log(`Webhook ${webhook.id} triggered successfully:`, result);
          return true;
        } catch (error) {
          console.error(`Failed to trigger webhook ${webhook.id}:`, error);
          return false;
        }
      });
      
      const results = await Promise.allSettled(promises);
      // Return true if at least one webhook was successfully triggered
      return results.some(result => result.status === 'fulfilled' && result.value === true);
    } catch (error) {
      console.error('Error triggering webhooks:', error);
      return false;
    }
  }

  // Middleware to handle Zapier webhook verification
  function validateZapierSignature(req: Request, res: Response, next: NextFunction) {
    const signature = req.headers['x-webhook-signature'] as string;
    const webhookId = req.params.id;
    
    // If no signature provided, skip validation
    if (!signature) {
      return next();
    }
    
    storage.getWebhook(parseInt(webhookId))
      .then(webhook => {
        if (!webhook || !webhook.secret) {
          return next();
        }
        
        // Verify signature
        const payload = JSON.stringify(req.body);
        const expectedSignature = crypto
          .createHmac('sha256', webhook.secret)
          .update(payload)
          .digest('hex');
        
        if (signature === expectedSignature) {
          next();
        } else {
          res.status(401).json({ message: 'Invalid webhook signature' });
        }
      })
      .catch(error => {
        console.error('Error validating webhook signature:', error);
        next();
      });
  }

  // Get all webhooks
  app.get("/api/webhooks", requireAuth, async (_req, res) => {
    try {
      const webhooks = await storage.getWebhooks();
      res.json(webhooks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch webhooks" });
    }
  });

  // Get single webhook
  app.get("/api/webhooks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid webhook ID" });
      }

      const webhook = await storage.getWebhook(id);
      if (!webhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      res.json(webhook);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch webhook" });
    }
  });

  // Create webhook
  app.post("/api/webhooks", requireAuth, async (req, res) => {
    const validatedData = validateBody(webhookSchema, req, res);
    if (!validatedData) return;

    try {
      // Create the webhook (the storage layer will add createdAt)
      const webhook = await storage.createWebhook(validatedData);
      res.status(201).json(webhook);
    } catch (error) {
      res.status(500).json({ message: "Failed to create webhook" });
    }
  });

  // Update webhook
  app.put("/api/webhooks/:id", requireAuth, async (req, res) => {
    const validatedData = validateBody(webhookSchema.partial(), req, res);
    if (!validatedData) return;

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid webhook ID" });
      }

      const webhook = await storage.updateWebhook(id, validatedData);
      if (!webhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      res.json(webhook);
    } catch (error) {
      res.status(500).json({ message: "Failed to update webhook" });
    }
  });

  // Delete webhook
  app.delete("/api/webhooks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid webhook ID" });
      }

      const success = await storage.deleteWebhook(id);
      if (!success) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete webhook" });
    }
  });

  // Zapier: Receive event data from external system
  app.post("/api/webhooks/zapier/events", async (req, res) => {
    const validatedData = validateBody(externalEventSchema, req, res);
    if (!validatedData) return;

    try {
      // Convert external event format to our event format
      const eventData = {
        title: validatedData.title,
        description: validatedData.description || "",
        date: validatedData.date,
        startTime: validatedData.startTime || null,
        endTime: validatedData.endTime || null,
        location: validatedData.location || null,
        capacity: validatedData.capacity,
        createdAt: new Date().toISOString() // Add createdAt field required by the model
      };

      // Create the event
      const event = await storage.createEvent(eventData);
      
      // Return the created event
      res.status(201).json({
        id: event.id,
        ...eventData,
        registrationUrl: `/events/${event.id}/register`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process external event" });
    }
  });

  // Remove the previous middleware as it's redundant with our direct webhook calls

  const httpServer = createServer(app);
  return httpServer;
}
