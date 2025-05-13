export const fieldTypeOptions = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text Area" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox Group" },
  { value: "radio", label: "Radio Group" },
  { value: "date", label: "Date" },
  { value: "event-select", label: "Event Selection" },
];

// Suggested sections for organizing multi-page forms
export const suggestedSections = [
  "Basic Information",
  "Contact Details",
  "Personal Information",
  "About You",
  "Additional Information",
  "Preferences",
  "Event Selection",
  "Event Details",
  "Payment Information",
  "Confirmation",
];

export const defaultFieldsByType = {
  text: {
    placeholder: "Enter text",
    required: true,
    section: "Basic Information",
  },
  textarea: {
    placeholder: "Enter longer text",
    required: true,
    section: "Additional Information",
  },
  email: {
    placeholder: "Enter email address",
    required: true,
    section: "Contact Details",
  },
  phone: {
    placeholder: "Enter phone number",
    required: true,
    section: "Contact Details",
  },
  select: {
    placeholder: "Select an option",
    required: true,
    options: ["Option 1", "Option 2", "Option 3"],
    section: "Preferences",
  },
  checkbox: {
    required: false,
    options: ["Option 1", "Option 2", "Option 3"],
    section: "Preferences",
  },
  radio: {
    required: true,
    options: ["Option 1", "Option 2", "Option 3"],
    section: "Preferences",
  },
  date: {
    placeholder: "Select a date",
    required: true,
    section: "Basic Information",
  },
  "event-select": {
    placeholder: "Select an event",
    required: true,
    eventIds: [],
    section: "Event Selection",
  },
};
