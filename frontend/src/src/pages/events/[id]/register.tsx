import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { Event, Form } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const EventRegistrationPage = () => {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  
  const { data: event, isLoading: eventLoading } = useQuery<Event & { registrationCount: number }>({
    queryKey: [`/api/events/${id}`],
  });
  
  // If event has a formId, fetch the associated form
  const { data: form, isLoading: formLoading } = useQuery<Form>({
    queryKey: [`/api/forms/${event?.formId}`],
    enabled: !!event?.formId,
  });
  
  const isLoading = eventLoading || (event?.formId && formLoading);
  
  useEffect(() => {
    // Set page title
    if (event) {
      document.title = `Register for ${event.title} | EventFlow`;
    }
  }, [event]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-12 w-full mb-6" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <p className="text-lg text-gray-600 mb-8">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/")}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }
  
  if (!event.formId || !form) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
          <p className="text-lg text-gray-600 mb-8">
            Registration is not available for this event yet. Please check back later.
          </p>
          <Button onClick={() => navigate("/")}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <FormRenderer
          title={form.title}
          description={form.description}
          fields={form.fields}
          event={event}
          themeColor={form.themeColor}
          buttonStyle={form.buttonStyle}
          requireAllFields={form.requireAllFields}
          successMessage={form.successMessage}
          onSubmit={(data) => {
            // The submit functionality is handled inside the FormRenderer component
            console.log("Form data submitted:", data);
          }}
        />
      </div>
    </div>
  );
};

export default EventRegistrationPage;
