import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getQueryFn, apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';

type AttendanceStatus = 'unknown' | 'attended' | 'not_attended';

interface RegistrationWithAttendance {
  id: number;
  eventId: number;
  formData: Record<string, any>;
  status: string;
  webhookStatus?: string;
  attended: boolean;
  attendanceNotes?: string;
  createdAt: string;
  // For UI state management
  attendanceStatus: AttendanceStatus;
  previousStatus?: AttendanceStatus;
  notes: string;
}

interface AttendanceDialogProps {
  eventId: number;
  open: boolean;
  onClose: () => void;
}

const AttendanceDialog = ({ eventId, open, onClose }: AttendanceDialogProps) => {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<RegistrationWithAttendance[]>([]);
  
  // Fetch event details
  const eventQuery = useQuery<{
    id: number;
    title: string;
    description: string;
    date: string;
    registrationCount: number;
  }>({
    queryKey: ['/api/events', eventId],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: open && !!eventId,
  });
  
  // Fetch registrations for this event
  const registrationsQuery = useQuery({
    queryKey: ['/api/registrations', { eventId }],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: open && !!eventId,
  });
  
  useEffect(() => {
    if (registrationsQuery.data && Array.isArray(registrationsQuery.data)) {
      // Filter registrations to only include those for this event
      const filteredRegistrations = registrationsQuery.data
        .filter((reg: any) => reg.eventId === eventId)
        .map((reg: any) => {
          // Map boolean attended to our new status enum
          let attendanceStatus: AttendanceStatus = 'unknown';
          if (reg.attended === true) {
            attendanceStatus = 'attended';
          } else if (reg.attended === false && reg.attendanceNotes) {
            // If there are notes but not attended, assume they were marked as not attended
            attendanceStatus = 'not_attended';
          }
          
          return {
            ...reg,
            attendanceStatus,
            previousStatus: attendanceStatus, // Track initial status for webhook triggers
            notes: reg.attendanceNotes || ''
          };
        });
      
      setRegistrations(filteredRegistrations);
    }
  }, [registrationsQuery.data, eventId]);
  
  // Update registration attendance status
  const updateAttendanceMutation = useMutation({
    mutationFn: async (data: { id: number, attended: boolean, attendanceNotes: string }) => {
      return await apiRequest(`/api/registrations/${data.id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/registrations'] });
      toast({
        title: 'Attendance updated',
        description: 'The attendance record has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating attendance',
        description: 'There was an error updating the attendance record.',
        variant: 'destructive',
      });
      console.error('Error updating attendance:', error);
    }
  });
  
  // Trigger webhook for specific registration status change
  const triggerWebhookForStatusChange = async (registrationId: number, newStatus: AttendanceStatus, oldStatus: AttendanceStatus) => {
    if (newStatus === oldStatus) return; // Don't trigger if no change
    
    try {
      const registration = registrations.find(r => r.id === registrationId);
      if (!registration) return;
      
      const participantName = getParticipantName(registration.formData);
      const participantEmail = registration.formData["5a2aa210-8c3d-485e-878b-0c8dceb0f9bc"] || '';
      
      // Map internal status values to proper capitalized format for webhook
      const statusMap: Record<AttendanceStatus, string> = {
        'unknown': 'Not Specified',
        'attended': 'Attended',
        'not_attended': 'Not Attended'
      };
      
      await apiRequest('POST', '/api/webhooks/trigger', {
        eventType: 'attendance.updated',
        eventId: eventId,
        data: {
          event_id: eventId,
          event_title: eventQuery.data?.title || 'Unknown Event',
          registration_id: registrationId,
          participant_name: participantName,
          participant_email: participantEmail,
          attendance_status: statusMap[newStatus],
          previous_status: statusMap[oldStatus],
          notes: registration.notes,
          updated_at: new Date().toISOString()
        }
      });
      
      toast({
        title: 'Webhook triggered',
        description: `Attendance update for ${participantName} has been sent to webhooks.`,
      });
    } catch (webhookError) {
      console.error('Error triggering attendance webhook:', webhookError);
      toast({
        title: 'Webhook error',
        description: 'Failed to send attendance update to webhooks.',
        variant: 'destructive',
      });
    }
  };
  
  // Update multiple registrations
  const updateAttendanceForAll = async () => {
    try {
      // Update all registrations one by one
      for (const reg of registrations) {
        // Map the attendanceStatus to boolean for database
        const isAttended = reg.attendanceStatus === 'attended';
        
        await updateAttendanceMutation.mutateAsync({
          id: reg.id,
          attended: isAttended,
          attendanceNotes: reg.notes
        });
      }
      
      // Trigger webhook for the overall event update
      if (registrations.length > 0) {
        try {
          await apiRequest('POST', '/api/webhooks/trigger', {
            eventType: 'attendance.updated',
            eventId: eventId,
            data: {
              event_id: eventId,
              event_title: eventQuery.data?.title || 'Unknown Event',
              updated_at: new Date().toISOString(),
              attendees: registrations.filter(r => r.attendanceStatus === 'attended').length,
              not_attended: registrations.filter(r => r.attendanceStatus === 'not_attended').length,
              total_registrations: registrations.length
            }
          });
        } catch (webhookError) {
          console.error('Error triggering attendance webhook:', webhookError);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating attendance for all registrations:', error);
    }
  };
  
  // Handle attendance status change
  const handleAttendanceStatusChange = (id: number, status: AttendanceStatus) => {
    setRegistrations(prevRegistrations => {
      const updatedRegistrations = prevRegistrations.map(reg => {
        if (reg.id === id) {
          const prevStatus = reg.attendanceStatus;
          const updatedReg = { ...reg, attendanceStatus: status };
          
          // Trigger webhook if the status changed from unknown to attended/not_attended
          if (prevStatus === 'unknown' && (status === 'attended' || status === 'not_attended')) {
            triggerWebhookForStatusChange(id, status, prevStatus);
          }
          
          return updatedReg;
        }
        return reg;
      });
      
      return updatedRegistrations;
    });
  };
  
  // Handle notes change for a specific registration
  const handleNotesChange = (id: number, notes: string) => {
    setRegistrations(
      registrations.map(reg => 
        reg.id === id ? { ...reg, notes } : reg
      )
    );
  };
  
  // Extract participant name from form data
  const getParticipantName = (formData: Record<string, any>) => {
    if (!formData) return 'Unknown Participant';
    
    // From our logs, we can see these UUIDs correspond to first and last name fields
    const firstName = formData["4a2b99cf-7244-4e93-8f29-2e02c6845960"];
    const lastName = formData["50592742-6389-40ea-8a85-c4291e99f545"];
    
    // Format the name properly (handle dash or empty last name)
    if (firstName) {
      if (lastName && lastName !== '-') {
        return `${firstName} ${lastName}`;
      }
      return firstName;
    }
    
    // Check common name fields as fallback
    if (formData["First Name"] || formData["first_name"] || formData["firstName"]) {
      const fName = formData["First Name"] || formData["first_name"] || formData["firstName"];
      const lName = formData["Last Name"] || formData["last_name"] || formData["lastName"];
      
      if (lName && lName !== '-') {
        return `${fName} ${lName}`;
      }
      return fName;
    }
    
    // Check for full name fields
    if (formData["Full Name"] || formData["fullName"] || formData["full_name"] || formData["name"]) {
      return formData["Full Name"] || formData["fullName"] || formData["full_name"] || formData["name"];
    }
    
    // Use email as last resort (without domain)
    const email = formData["5a2aa210-8c3d-485e-878b-0c8dceb0f9bc"];
    if (email && typeof email === 'string' && email.includes('@')) {
      return email.split('@')[0];
    }
    
    return 'Unknown Participant';
  };
  
  const isLoading = eventQuery.isLoading || registrationsQuery.isLoading;
  const isSaving = updateAttendanceMutation.isPending;
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Track Attendance: {eventQuery.data?.title || 'Event'}
          </DialogTitle>
          <DialogDescription>
            Record attendance for participants. Use the dropdown to select if they attended or not.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No registrations found for this event.
          </div>
        ) : (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto p-1">
            {registrations.map((registration) => (
              <div key={registration.id} className="border rounded-md p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">
                      {getParticipantName(registration.formData)}
                    </h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Registered:</span> {new Date(registration.createdAt).toLocaleDateString()}
                      </p>
                      {registration.formData["5a2aa210-8c3d-485e-878b-0c8dceb0f9bc"] && (
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Email:</span> {registration.formData["5a2aa210-8c3d-485e-878b-0c8dceb0f9bc"]}
                        </p>
                      )}
                      {registration.formData["7a006b3a-6516-4981-a333-e92b98970f29"] && registration.formData["7a006b3a-6516-4981-a333-e92b98970f29"] !== '-' && (
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Phone:</span> {registration.formData["7a006b3a-6516-4981-a333-e92b98970f29"]}
                        </p>
                      )}
                      {registration.formData["7d903ce3-3998-4c37-94f9-8d0257b8d279"] && (
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Occupation:</span> {registration.formData["7d903ce3-3998-4c37-94f9-8d0257b8d279"]}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="w-48">
                    <Label htmlFor={`attendance-${registration.id}`}>
                      Attendance Status
                    </Label>
                    <Select
                      value={registration.attendanceStatus}
                      onValueChange={(value: AttendanceStatus) => 
                        handleAttendanceStatusChange(registration.id, value as AttendanceStatus)
                      }
                    >
                      <SelectTrigger 
                        id={`attendance-${registration.id}`}
                        className={`mt-1 ${
                          registration.attendanceStatus === 'attended' 
                            ? 'border-green-500 text-green-600' 
                            : registration.attendanceStatus === 'not_attended'
                              ? 'border-red-400 text-red-600'
                              : ''
                        }`}
                      >
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">Not Specified</SelectItem>
                        <SelectItem value="attended">Attended</SelectItem>
                        <SelectItem value="not_attended">Not Attended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`notes-${registration.id}`}>
                    Notes
                  </Label>
                  <Textarea 
                    id={`notes-${registration.id}`}
                    placeholder="Add any notes about this participant's attendance"
                    value={registration.notes}
                    onChange={(e) => handleNotesChange(registration.id, e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={updateAttendanceForAll} 
            disabled={isLoading || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Attendance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceDialog;