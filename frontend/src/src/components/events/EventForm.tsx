import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { z } from "zod";
import { insertEventSchema, Form as FormType } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Extended schema with additional validation for the form
const eventFormSchema = insertEventSchema.extend({
  date: z.string().min(1, "Event date is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  // Make sure we don't require createdAt on the form
  createdAt: z.string().optional(),
  // Add formId as an optional field
  formId: z.number().optional().nullable(),
}).refine(data => {
  if (data.startTime && data.endTime) {
    return data.startTime < data.endTime;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  eventId?: string;
  defaultValues?: EventFormValues;
}

const EventForm = ({ eventId, defaultValues }: EventFormProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    defaultValues?.date ? new Date(defaultValues.date) : undefined
  );
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: defaultValues || {
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      capacity: 0,
    },
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const response = await apiRequest("POST", "/api/events", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Event created successfully",
        description: "The event has been created and is now available for registrations.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      navigate("/admin/events");
    },
    onError: (error) => {
      toast({
        title: "Failed to create event",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const response = await apiRequest("PUT", `/api/events/${eventId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Event updated successfully",
        description: "The event has been updated with the new information.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      navigate("/admin/events");
    },
    onError: (error) => {
      toast({
        title: "Failed to update event",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: EventFormValues) => {
    console.log("Form submitted with data:", data);
    if (eventId) {
      console.log("Updating event:", eventId);
      updateMutation.mutate(data);
    } else {
      console.log("Creating new event");
      createMutation.mutate(data);
    }
  };
  
  // Fetch available forms
  const { data: forms, isLoading: isLoadingForms } = useQuery<FormType[]>({
    queryKey: ['/api/forms'],
  });
  
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // Fix timezone issues by using local date formatting
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      form.setValue("date", formattedDate, { shouldValidate: true });
    }
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Summer Tech Conference" {...field} />
                  </FormControl>
                  <FormDescription>
                    Give your event a clear and descriptive name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your event details, agenda, and what attendees can expect..." 
                      rows={4} 
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide details about your event to help attendees understand what to expect.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Event Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Convention Center or Online" 
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="e.g., 100" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of attendees.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Registration Form Selection */}
            <FormField
              control={form.control}
              name="formId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Form</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? field.value.toString() : "none"}
                      onValueChange={(value) => {
                        if (value === "none" || value === "loading" || value === "unavailable") {
                          field.onChange(null);
                        } else {
                          field.onChange(parseInt(value));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a registration form" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No form (registration disabled)</SelectItem>
                        {isLoadingForms ? (
                          <SelectItem value="loading" disabled>Loading forms...</SelectItem>
                        ) : !forms || forms.length === 0 ? (
                          <SelectItem value="unavailable" disabled>No forms available</SelectItem>
                        ) : (
                          forms.map(form => (
                            <SelectItem key={form.id} value={form.id.toString()}>
                              {form.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Select a form for event registration or leave empty to disable registration.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/admin/events")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  console.log("Form state:", form.getValues());
                  console.log("Form errors:", form.formState.errors);
                  console.log("Form valid:", form.formState.isValid);
                }}
              >
                Debug Form
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                onClick={() => console.log("Submit button clicked")}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <span className="mr-2">
                      {eventId ? "Updating..." : "Creating..."}
                    </span>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  </>
                ) : (
                  eventId ? "Update Event" : "Create Event"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default EventForm;
