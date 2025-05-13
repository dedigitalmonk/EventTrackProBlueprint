// Use this as a reference for updating the webhook trigger code
// Look for the manual webhook trigger function around line 490 and update it as follows:

// Extract registration fields from form data
const formData = registration.formData as Record<string, any>;

// Log the form data keys for debugging
console.log("Registration form data keys:", Object.keys(formData));

// Get the values directly from the form fields using their IDs from the logs
const firstName = formData["4a2b99cf72444e938f292e02c6845960"] || "";
const lastName = formData["50592742638940ea8a85c4291e99f545"] || "";
const email = formData["5a2aa2108c3d485e878b0c8dceb0f9bc"] || "";

console.log("Extracted field values:", { firstName, lastName, email });
