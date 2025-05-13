import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { Button } from "@/components/ui/button";
import { Form, Event } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const ViewFormPage = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const formId = parseInt(id as string);
  
  const { data: form, isLoading, error } = useQuery<Form>({
    queryKey: [`/api/forms/${formId}`],
    enabled: !isNaN(formId),
    retry: 1,
  });
  
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
  
  // Find linked event if the form is connected to an event
  const linkedEvent = events?.find(event => event.formId === formId);
  
  // Get selected event from event-select field if available
  const hasEventSelect = form?.fields?.some(field => field.type === 'event-select');
  const selectedEventId = form?.fields?.find(field => field.type === 'event-select')?.eventIds?.[0];
  let selectedEvent: (Event & { registrationCount: number }) | undefined = undefined;
  
  if (hasEventSelect && selectedEventId && events) {
    // Find the event and include registration count
    const foundEvent = events.find(event => event.id === selectedEventId);
    if (foundEvent) {
      // Get registration count from API if needed
      selectedEvent = { 
        ...foundEvent, 
        registrationCount: (foundEvent as any).registrationCount || 0 
      };
    }
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <p className="mt-4 text-lg text-gray-600">Loading form...</p>
      </div>
    );
  }
  
  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
        <p className="text-gray-600 mb-6">The form you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/")}>Go to Home</Button>
      </div>
    );
  }
  
  // For standalone forms (not linked to an event)
  const handleSubmit = async (data: any) => {
    try {
      // If this form is linked to an event, the FormRenderer will handle submission
      // This is only for standalone forms without an event
      if (!linkedEvent) {
        toast({
          title: "Form Submitted",
          description: "Thank you for your submission!",
        });
        // For standalone forms we could store in a different way
        // For now just log to console
        console.log("Standalone form data:", data);
      } else {
        // This should not be needed as FormRenderer handles event registrations
        // But as a fallback, let's implement it here too
        console.log("Submitting event registration:", data);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Submission Error",
        description: "There was a problem submitting your form. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Generate shareable link
  const formLink = `${window.location.origin}/forms/${form.id}/view`;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(formLink);
    toast({
      title: "Link copied!",
      description: "The form link has been copied to your clipboard.",
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Form rendering */}
        <FormRenderer
          title={form.title}
          description={form.description}
          fields={form.fields}
          event={selectedEvent || linkedEvent as any} // Use selected event from form or linked event
          themeColor={form.themeColor}
          buttonStyle={form.buttonStyle}
          requireAllFields={form.requireAllFields}
          successMessage={form.successMessage}
          onSubmit={handleSubmit}
        />
        
        {/* Share dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share this form</DialogTitle>
              <DialogDescription>
                Anyone with this link will be able to view and submit this form.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 mt-4">
              <div className="grid flex-1 gap-2">
                <Input
                  readOnly
                  value={formLink}
                  className="w-full"
                />
              </div>
              <Button type="submit" size="sm" onClick={copyToClipboard}>
                Copy
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ViewFormPage;