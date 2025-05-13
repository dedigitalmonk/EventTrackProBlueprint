import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { Plus } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import EventsTable from "@/components/events/EventTable";
import { Event } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LocationFilter = "all" | "online" | "offline";

const EventsPage = () => {
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  
  const { data: events, isLoading } = useQuery<(Event & { registrationCount: number })[]>({
    queryKey: ["/api/events"],
  });
  
  const filteredEvents = events ? events.filter(event => {
    if (locationFilter === "all") return true;
    if (locationFilter === "online") return !event.location || event.location.trim() === "" || event.location.toLowerCase() === "online";
    if (locationFilter === "offline") return event.location && event.location.trim() !== "" && event.location.toLowerCase() !== "online";
    return true;
  }) : [];

  return (
    <AdminLayout title="Events">
      <PageHeader
        title="Events"
        description="Manage your events and registrations"
        action={
          <Button asChild>
            <Link href="/admin/events/new" className="flex items-center">
              <Plus className="mr-2 h-4 w-4" /> New Event
            </Link>
          </Button>
        }
      />
      
      <div className="mb-4 flex justify-end">
        <Select
          value={locationFilter}
          onValueChange={(value) => setLocationFilter(value as LocationFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="online">Online Only</SelectItem>
            <SelectItem value="offline">In-Person Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <EventsTable events={filteredEvents} isLoading={isLoading} />
    </AdminLayout>
  );
};

export default EventsPage;
