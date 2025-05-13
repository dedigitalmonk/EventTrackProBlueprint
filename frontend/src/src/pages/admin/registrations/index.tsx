import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/ui/page-header";
import RegistrationTable from "@/components/registrations/RegistrationTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Registration, Event } from "@shared/schema";

const RegistrationsPage = () => {
  const [location] = useLocation();
  const queryParams = new URLSearchParams(location.split("?")[1] || "");
  const eventIdParam = queryParams.get("eventId");
  
  const { data: registrations, isLoading: registrationsLoading } = useQuery<Registration[]>({
    queryKey: ["/api/registrations"],
  });
  
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // If eventId is provided, filter registrations for that event
  const filteredRegistrations = eventIdParam && registrations
    ? registrations.filter(reg => reg.eventId === parseInt(eventIdParam))
    : registrations;

  // For the event-specific view, get the event name
  const selectedEvent = eventIdParam && events
    ? events.find(event => event.id === parseInt(eventIdParam))
    : null;

  return (
    <AdminLayout>
      <PageHeader
        title={selectedEvent ? `${selectedEvent.title} Registrations` : "Registrations"}
        description={selectedEvent 
          ? `Manage registrations for ${selectedEvent.title}`
          : "View and manage all event registrations"
        }
      />
      
      {!selectedEvent && (
        <Tabs defaultValue="all" className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Registrations</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <RegistrationTable 
              registrations={filteredRegistrations || []} 
              isLoading={registrationsLoading || eventsLoading}
            />
          </TabsContent>
          
          <TabsContent value="confirmed">
            <RegistrationTable 
              registrations={(filteredRegistrations || []).filter(reg => reg.status === "confirmed")} 
              isLoading={registrationsLoading || eventsLoading}
            />
          </TabsContent>
          
          <TabsContent value="pending">
            <RegistrationTable 
              registrations={(filteredRegistrations || []).filter(reg => reg.status === "pending")} 
              isLoading={registrationsLoading || eventsLoading}
            />
          </TabsContent>
        </Tabs>
      )}
      
      {selectedEvent && (
        <RegistrationTable 
          registrations={filteredRegistrations || []} 
          isLoading={registrationsLoading || eventsLoading}
          showEventColumn={false}
        />
      )}
    </AdminLayout>
  );
};

export default RegistrationsPage;
