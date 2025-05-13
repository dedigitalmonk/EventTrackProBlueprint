import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/ui/page-header";
import EventForm from "@/components/events/EventForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Event } from "@shared/schema";

const EventDetailPage = () => {
  const { id } = useParams();
  
  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${id}`],
  });
  
  if (isLoading) {
    return (
      <AdminLayout>
        <PageHeader
          title={<Skeleton className="h-8 w-64" />}
          description={<Skeleton className="h-4 w-48" />}
        />
        
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }
  
  if (!event) {
    return (
      <AdminLayout>
        <PageHeader
          title="Event Not Found"
          description="The event you're looking for doesn't exist or has been removed."
          action={
            <Button asChild>
              <a href="/admin/events">Back to Events</a>
            </Button>
          }
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title={`Edit Event: ${event.title}`}
        description="Update your event details"
      />
      
      <EventForm eventId={id} defaultValues={event} />
    </AdminLayout>
  );
};

export default EventDetailPage;
