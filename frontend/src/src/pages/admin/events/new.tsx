import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/ui/page-header";
import EventForm from "@/components/events/EventForm";

const NewEventPage = () => {
  return (
    <AdminLayout>
      <PageHeader
        title="Create New Event"
        description="Add a new event to your calendar"
      />
      
      <EventForm />
    </AdminLayout>
  );
};

export default NewEventPage;
