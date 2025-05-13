import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Edit, MoreVertical, UserCheck, Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Event } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AttendanceDialog from "./AttendanceDialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EventWithRegistrations extends Event {
  registrationCount: number;
}

interface EventsTableProps {
  events: EventWithRegistrations[];
  isLoading?: boolean;
}

const EventsTable = ({ events, isLoading = false }: EventsTableProps) => {
  // State for attendance dialog
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [sentEventIds, setSentEventIds] = useState<number[]>([]);
  const { toast } = useToast();
  
  // Mutation for sending event data to Zapier
  const sendEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return await apiRequest(
        "POST",
        "/api/webhooks/test-event", 
        { eventId }
      );
    },
    onSuccess: (_, eventId) => {
      // Add the event to the list of successfully sent events
      setSentEventIds(prev => {
        if (!prev.includes(eventId)) {
          return [...prev, eventId];
        }
        return prev;
      });
      
      toast({
        title: "Event sent to Zapier",
        description: "The event data was successfully sent to all configured webhooks.",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to send event",
        description: "There was an error sending the event to Zapier. Please check your webhook configuration.",
        variant: "destructive",
        duration: 5000,
      });
      console.error("Error sending event to Zapier:", error);
    },
  });

  // Handler for sending event data to Zapier
  const handleSendToZapier = (event: EventWithRegistrations) => {
    sendEventMutation.mutate(event.id);
  };
  
  // Visual indicator for drop-down item when sending event
  const SendToZapierMenuItem = ({ event }: { event: EventWithRegistrations }) => {
    const isPending = sendEventMutation.isPending;
    const isSent = sentEventIds.includes(event.id);
    
    return (
      <DropdownMenuItem 
        onClick={() => handleSendToZapier(event)}
        disabled={isPending}
        className="flex items-center gap-2"
      >
        {isPending ? (
          <>
            <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Sending...</span>
          </>
        ) : isSent ? (
          <>
            <svg 
              className="h-4 w-4 text-green-500" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>Already sent</span>
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            <span>Send to Zapier</span>
          </>
        )}
      </DropdownMenuItem>
    );
  };
  
  // Open attendance dialog for an event
  const openAttendanceDialog = (eventId: number) => {
    setSelectedEventId(eventId);
    setAttendanceDialogOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-8 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500">Loading events...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-8 text-center">
        <h3 className="text-lg font-medium text-gray-800 mb-2">No events found</h3>
        <p className="text-gray-500 mb-4">Get started by creating your first event</p>
        <Button asChild>
          <Link href="/admin/events/new">Create Event</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-100 overflow-hidden">
      {/* Attendance tracking dialog */}
      {selectedEventId && (
        <AttendanceDialog
          eventId={selectedEventId}
          open={attendanceDialogOpen}
          onClose={() => setAttendanceDialogOpen(false)}
        />
      )}
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Event Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.title}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(event.date), "MMM d, yyyy")}
                  </div>
                  {event.startTime && event.endTime && (
                    <div className="text-sm text-gray-500">
                      {event.startTime} - {event.endTime}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{event.location || "Online"}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div className="mr-2 text-sm">
                      {event.registrationCount}/{event.capacity}
                    </div>
                    <div className="w-20">
                      <Progress 
                        value={(event.registrationCount / event.capacity) * 100} 
                        className={
                          event.registrationCount >= event.capacity 
                            ? "bg-red-200" 
                            : undefined
                        }
                        indicatorClassName={
                          event.registrationCount >= event.capacity 
                            ? "bg-red-500" 
                            : undefined
                        }
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {event.registrationCount >= event.capacity ? (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                      Full
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/events/${event.id}`}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit event</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openAttendanceDialog(event.id)}
                        >
                          <UserCheck className="h-4 w-4" />
                          <span className="sr-only">Track attendance</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Track attendance</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/registrations?eventId=${event.id}`}>
                          View registrations
                        </Link>
                      </DropdownMenuItem>
                      <SendToZapierMenuItem event={event} />
                      <DropdownMenuItem>
                        Duplicate event
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        Delete event
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EventsTable;
