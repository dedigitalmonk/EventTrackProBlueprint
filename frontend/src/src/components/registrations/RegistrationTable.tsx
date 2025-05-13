import { useState, useEffect } from "react";
import { Edit, Mail, Search, MoreVertical, Info, X, Trash2, AlertCircle, Send, ZapIcon } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Registration, Event, Form, FormField } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RegistrationTableProps {
  registrations: Registration[];
  isLoading?: boolean;
  showEventColumn?: boolean;
}

const RegistrationTable = ({ 
  registrations, 
  isLoading = false,
  showEventColumn = true
}: RegistrationTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [registrationToDelete, setRegistrationToDelete] = useState<Registration | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isWebhookTriggering, setIsWebhookTriggering] = useState<number | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<{id: number, status: 'success' | 'error', message: string} | null>(null);
  
  // Fetch all forms to get field labels
  const { data: forms } = useQuery<Form[]>({
    queryKey: ['/api/forms'],
  });
  
  // Fetch all events to get event information
  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });
  
  // Function to delete a registration
  const handleDeleteRegistration = async () => {
    if (!registrationToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/registrations/${registrationToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete registration');
      }
      
      // Close dialogs and refresh the page
      setIsDeleteConfirmOpen(false);
      setRegistrationToDelete(null);
      
      // Reload the page to get fresh data after deletion
      window.location.reload();
      
    } catch (error) {
      console.error('Error deleting registration:', error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Function to manually trigger a webhook for a registration
  const handleTriggerWebhook = async (registrationId: number) => {
    try {
      // Set the loading state for this specific registration
      setIsWebhookTriggering(registrationId);
      
      const response = await fetch(`/api/registrations/${registrationId}/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to trigger webhook');
      }
      
      // Update the registration's webhook status in the database
      await fetch(`/api/registrations/${registrationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookStatus: 'sent'
        })
      });
      
      // Update UI to reflect the change without page reload
      const updatedRegistrations = registrations.map(reg => {
        if (reg.id === registrationId) {
          return { ...reg, webhookStatus: 'sent' };
        }
        return reg;
      });
      
      // Set success status
      setWebhookStatus({
        id: registrationId,
        status: 'success',
        message: 'Webhook triggered successfully and status updated'
      });
      
      // Clear success status after 3 seconds
      setTimeout(() => {
        setWebhookStatus(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error triggering webhook:', error);
      setWebhookStatus({
        id: registrationId,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to trigger webhook'
      });
      
      // Clear error status after 5 seconds
      setTimeout(() => {
        setWebhookStatus(null);
      }, 5000);
    } finally {
      setIsWebhookTriggering(null);
    }
  };
  
  // When a registration is selected, find the matching form and extract field labels
  useEffect(() => {
    if (selectedRegistration && forms && events) {
      try {
        // Get the event associated with this registration
        const event = events.find(e => e.id === selectedRegistration.eventId);
        
        // If we have a registration, process all forms to find matching field IDs
        // We don't rely only on the event's form since fields could be from any form in a multi-form setup
        if (forms.length > 0) {
          const labels: Record<string, string> = {};
          
          // Look through all forms and collect all field labels
          forms.forEach(form => {
            // Parse form fields
            let formFields;
            try {
              formFields = typeof form.fields === 'string' 
                ? JSON.parse(form.fields as unknown as string) 
                : form.fields;
            } catch {
              console.error(`Could not parse fields for form ${form.id}`);
              return;
            }
            
            // Add each field's label to our mapping
            if (Array.isArray(formFields)) {
              formFields.forEach((field: any) => {
                if (field.id && field.label) {
                  labels[field.id] = field.label;
                }
              });
            }
          });
          
          console.log("Found field labels:", labels);
          setFieldLabels(labels);
        }
      } catch (error) {
        console.error("Error processing form fields:", error);
      }
    }
  }, [selectedRegistration, forms, events]);
  
  const filteredRegistrations = registrations.filter(registration => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const formData = registration.formData as Record<string, any>;
    
    // Search in form data (name, email, etc.)
    return Object.values(formData).some(value => 
      value && typeof value === 'string' && value.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-8 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500">Loading registrations...</p>
        </div>
      </div>
    );
  }
  
  if (registrations.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-8 text-center">
        <h3 className="text-lg font-medium text-gray-800 mb-2">No registrations found</h3>
        <p className="text-gray-500">
          There are currently no registrations for this event.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search registrations..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Registration Details Dialog */}
      <Dialog open={!!selectedRegistration} onOpenChange={(open) => !open && setSelectedRegistration(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedRegistration && format(new Date(selectedRegistration.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRegistration && (
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Registration ID</h4>
                  <p className="text-sm font-medium">{selectedRegistration.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                  <Badge 
                    variant="outline" 
                    className={
                      selectedRegistration.status === "confirmed" 
                        ? "bg-green-100 text-green-800 hover:bg-green-100" 
                        : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                    }
                  >
                    {selectedRegistration.status === "confirmed" ? "Confirmed" : "Pending"}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Webhook Status</h4>
                  <Badge 
                    variant="outline" 
                    className={
                      selectedRegistration.webhookStatus === "sent" 
                        ? "bg-blue-100 text-blue-800 hover:bg-blue-100" 
                        : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                    }
                  >
                    {selectedRegistration.webhookStatus === "sent" ? "Sent" : "NotSent"}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Event ID</h4>
                  <p className="text-sm font-medium">{selectedRegistration.eventId}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Event Name</h4>
                  <p className="text-sm font-medium">
                    {(selectedRegistration.formData as any)?.eventName || "Unknown Event"}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Form Submission Data</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(selectedRegistration.formData as Record<string, any>).map(([key, value], index) => {
                        // Try to get a more user-friendly field name
                        let displayKey = key;
                        
                        // Special case for eventName field
                        if (key === 'eventName') {
                          displayKey = 'Event';
                        } 
                        // If we have the field labels from the form, use them
                        else if (fieldLabels[key]) {
                          displayKey = fieldLabels[key];
                        }
                        // Try some common patterns if no field label is found
                        else if (key.includes('-') && key.length > 30) {
                          // This is likely a UUID, try to guess something appropriate
                          if (key.toLowerCase().includes('email')) {
                            displayKey = 'Email';
                          } else if (key.toLowerCase().includes('name')) {
                            displayKey = 'Name';
                          } else {
                            // Show a question-like format to indicate it's an input field
                            displayKey = `Question ${index + 1}`;
                          }
                        }
                        
                        return (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{displayKey}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">
                              {Array.isArray(value) 
                                ? value.join(', ')
                                : typeof value === 'object' && value !== null
                                  ? JSON.stringify(value)
                                  : String(value)
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedRegistration(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="bg-white shadow-sm rounded-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Name</TableHead>
                {showEventColumn && <TableHead>Event</TableHead>}
                <TableHead>Registered On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Information</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegistrations.map((registration) => {
                const formData = registration.formData as Record<string, any>;
                
                // Try to find fields with common names or try to guess if they're name/email fields
                let fullName = "";
                let email = "";
                
                // First look for specific field names
                const eventName = formData.eventName || "Unknown Event";
                
                // Look for any field that might be a name or email
                // Skip eventName, it's not a person's name
                for (const [key, value] of Object.entries(formData)) {
                  if (value && typeof value === "string" && key !== "eventName") {
                    const keyLower = key.toLowerCase();
                    
                    // Try to identify name fields
                    if (
                      keyLower.includes("name") && !keyLower.includes("event") || 
                      keyLower.includes("first") || 
                      keyLower.includes("last") ||
                      keyLower === "fullname"
                    ) {
                      if (!fullName) {
                        fullName = value;
                      }
                    }
                    
                    // Try to identify email fields
                    if (
                      keyLower.includes("email") || 
                      keyLower.includes("mail") ||
                      value.includes("@")
                    ) {
                      email = value;
                    }
                  }
                }
                
                // If we couldn't find a name, check if there's an email and use that
                if (!fullName && email) {
                  fullName = email.split("@")[0]; // Use part before @ as a name
                }
                
                // Get first letter of name for avatar
                const nameInitial = fullName.charAt(0).toUpperCase() || "U";
                
                return (
                  <TableRow key={registration.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {nameInitial}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{fullName || "Anonymous"}</div>
                          <div className="text-sm text-gray-500">{email}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    {showEventColumn && (
                      <TableCell>
                        <div className="text-sm text-gray-900">{eventName}</div>
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <div className="text-sm text-gray-900">
                        {format(new Date(registration.createdAt), "MMM d, yyyy")}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(registration.createdAt), "h:mm a")}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          registration.status === "confirmed" 
                            ? "bg-green-100 text-green-800 hover:bg-green-100" 
                            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                        }
                      >
                        {registration.status === "confirmed" ? "Confirmed" : "Pending"}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          registration.webhookStatus === "sent" 
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-100" 
                            : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }
                      >
                        {registration.webhookStatus === "sent" ? "Sent" : "NotSent"}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      
                      <Button variant="ghost" size="icon">
                        <Mail className="h-4 w-4" />
                        <span className="sr-only">Email</span>
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedRegistration(registration)}>
                            <Info className="mr-2 h-4 w-4" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setRegistrationToDelete(registration);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete registration
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleTriggerWebhook(registration.id)}
                            disabled={isWebhookTriggering === registration.id}
                            className="text-purple-600 focus:text-purple-600"
                          >
                            {isWebhookTriggering === registration.id ? (
                              <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                                Sending to Zapier...
                              </>
                            ) : (
                              <>
                                <ZapIcon className="mr-2 h-4 w-4" />
                                Send to Zapier
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {registrations.length > 10 && (
          <div className="px-6 py-3 bg-gray-50 text-center">
            <Button variant="link" className="text-primary text-sm font-medium">
              View All Registrations
            </Button>
          </div>
        )}
        
        {/* Webhook status notification */}
        {webhookStatus && (
          <div className={`px-4 py-3 ${webhookStatus.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'} flex items-center justify-between`}>
            <div className="flex items-center">
              {webhookStatus.status === 'success' ? (
                <div className="mr-2 rounded-full bg-green-100 p-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.66674 10.1148L12.7947 3.98608L13.7381 4.92875L6.66674 12.0001L2.42407 7.75742L3.36674 6.81475L6.66674 10.1148Z" fill="currentColor"/>
                  </svg>
                </div>
              ) : (
                <div className="mr-2 rounded-full bg-red-100 p-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.00001 6.10042L11.95 2.15042L13.8 4.00042L9.85001 7.95042L13.8 11.9004L11.95 13.7504L8.00001 9.80042L4.05001 13.7504L2.20001 11.9004L6.15001 7.95042L2.20001 4.00042L4.05001 2.15042L8.00001 6.10042Z" fill="currentColor"/>
                  </svg>
                </div>
              )}
              <span>{webhookStatus.message}</span>
            </div>
            <button 
              onClick={() => setWebhookStatus(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this registration?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this registration
              and remove the data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (registrationToDelete) {
                  fetch(`/api/registrations/${registrationToDelete.id}`, {
                    method: 'DELETE',
                  })
                  .then(response => {
                    if (!response.ok) throw new Error('Failed to delete');
                    setIsDeleteConfirmOpen(false);
                    // Reload the page to refresh data
                    window.location.reload();
                  })
                  .catch(err => {
                    console.error('Error deleting registration:', err);
                  });
                }
              }}
              className="bg-red-600 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin">⏳</span>
                  Deleting...
                </>
              ) : (
                <>Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RegistrationTable;
