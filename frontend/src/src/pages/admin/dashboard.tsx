import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Calendar, UserCheck, FileEdit, Plus } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import EventsTable from "@/components/events/EventTable";
import RegistrationTable from "@/components/registrations/RegistrationTable";
import { Event, Registration } from "@shared/schema";

const Dashboard = () => {
  const { data: events, isLoading: eventsLoading } = useQuery<(Event & { registrationCount: number })[]>({
    queryKey: ["/api/events"],
  });
  
  const { data: registrations, isLoading: registrationsLoading } = useQuery<Registration[]>({
    queryKey: ["/api/registrations"],
  });
  
  const { data: forms, isLoading: formsLoading } = useQuery({
    queryKey: ["/api/forms"],
  });
  
  // Calculate statistics
  const activeEvents = events?.filter(
    event => new Date(event.date) >= new Date()
  ).length || 0;
  
  const totalRegistrations = registrations?.length || 0;
  const formsCreated = forms?.length || 0;
  
  // Get upcoming events (sorted by date)
  const upcomingEvents = events 
    ? [...events]
        .filter(event => new Date(event.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5)
    : [];
  
  // Get recent registrations (sorted by creation date, most recent first)
  const recentRegistrations = registrations 
    ? [...registrations]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
    : [];

  return (
    <AdminLayout title="Dashboard">
      {/* Upcoming Events */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Upcoming Events</h2>
          <Button asChild>
            <Link href="/admin/events/new" className="flex items-center">
              <Plus className="mr-2 h-4 w-4" /> New Event
            </Link>
          </Button>
        </div>
        
        <EventsTable 
          events={upcomingEvents} 
          isLoading={eventsLoading} 
        />
      </div>
      
      {/* Recent Registrations */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Registrations</h2>
          <Button variant="link" asChild>
            <Link href="/admin/registrations">View All Registrations</Link>
          </Button>
        </div>
        
        <RegistrationTable 
          registrations={recentRegistrations} 
          isLoading={registrationsLoading}
        />
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
