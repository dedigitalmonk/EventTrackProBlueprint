import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { FormField, Event } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, MapPin, Users, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FormRendererProps {
  title: string;
  description?: string;
  fields: FormField[];
  event?: Event & { registrationCount: number };
  themeColor?: string;
  buttonStyle?: string;
  requireAllFields?: boolean;
  successMessage?: string;
  onSubmit: (data: any) => void;
  isPreview?: boolean;
}

export function FormRenderer({
  title,
  description,
  fields,
  event,
  themeColor = "#3B82F6",
  buttonStyle = "rounded",
  requireAllFields = true,
  successMessage = "Thank you for registering! We'll send you a confirmation email with all the details.",
  onSubmit,
  isPreview = false
}: FormRendererProps) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  
  // Group fields by section
  const fieldsBySection: Record<string, FormField[]> = {};
  
  // Default section for fields without a section specified
  const DEFAULT_SECTION = "Registration Information";
  
  fields.forEach(field => {
    // Use the section specified in the field or the default section
    const section = field.section || DEFAULT_SECTION;
    
    if (!fieldsBySection[section]) {
      fieldsBySection[section] = [];
    }
    fieldsBySection[section].push(field);
  });
  
  // Keep track of current page/section
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  // Get all unique sections
  const allSections = Object.keys(fieldsBySection);
  
  // For empty forms or preview, ensure we have at least one section
  const sections = allSections.length > 0 ? allSections : ["Default"];
  
  // Create default values
  const defaultValues: Record<string, any> = {};
  fields.forEach(field => {
    switch (field.type) {
      case "checkbox":
        defaultValues[field.id] = [];
        break;
      default:
        defaultValues[field.id] = "";
        break;
    }
  });
  
  const { control, handleSubmit, formState: { errors, isSubmitting }, getValues, trigger } = useForm({
    defaultValues
  });
  
  const registrationMutation = useMutation({
    mutationFn: async (data: any) => {
      // Don't actually submit if in preview mode
      if (isPreview) {
        console.log("Preview mode - not submitting to backend:", data);
        return data;
      }
      
      // Check if we have an event to register for, either from:
      // 1. The event prop passed directly to FormRenderer, or
      // 2. An event selected in an event-select field within the form
      
      // First check direct event prop
      if (event) {
        console.log("Submitting event registration from event prop:", event.id);
        const formData = {
          eventId: event.id,
          formData: data,
          status: "confirmed",
          createdAt: new Date().toISOString()
        };
        
        const response = await apiRequest("POST", "/api/registrations", formData);
        return response.json();
      } 
      
      // Next check if any event-select field has a value
      let eventId: number | null = null;
      
      for (const field of fields) {
        if (field.type === 'event-select' && data[field.id]) {
          eventId = parseInt(data[field.id], 10);
          if (!isNaN(eventId)) {
            break;
          }
        }
      }
      
      if (eventId) {
        console.log("Submitting event registration from event-select field:", eventId);
        const formData = {
          eventId,
          formData: data,
          status: "confirmed",
          createdAt: new Date().toISOString()
        };
        
        const response = await apiRequest("POST", "/api/registrations", formData);
        return response.json();
      }
      
      // If we get here, it's a standalone form with no event
      console.log("Standalone form submission - passing to onSubmit handler:", data);
      return data;
    },
    onSuccess: () => {
      setSubmitted(true);
      if (!isPreview) {
        setTimeout(() => {
          navigate("/thank-you");
        }, 2000);
      }
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  });
  
  const submitForm = (data: any) => {
    // Add event name to the form data
    if (event) {
      data.eventName = event.title;
    }
    
    if (isPreview) {
      console.log("PREVIEW MODE - No actual submission");
      onSubmit(data);
      return;
    }
    
    // Check if there's an event_id in the form data from an event-select field
    // and update eventName accordingly
    for (const field of fields) {
      if (field.type === 'event-select' && data[field.id]) {
        const selectedEventId = parseInt(data[field.id], 10);
        if (!isNaN(selectedEventId)) {
          // Find the selected event in availableEvents
          const selectedEvent = availableEvents.find(e => e.id === selectedEventId);
          if (selectedEvent) {
            // Update eventName to match the selected event
            data.eventName = selectedEvent.title;
          }
        }
      }
    }
    
    console.log("SUBMITTING FORM: event?", !!event, "hasEventInForm?", !!data.eventName);
    
    // Submit the registration
    registrationMutation.mutate(data);
  };
  
  // Handle form pagination navigation
  const goToNextPage = async () => {
    // Get fields for current section
    const currentSectionFields = fieldsBySection[sections[currentPageIndex]] || [];
    
    // Get field IDs that need validation
    const fieldIds = currentSectionFields
      .filter(field => requireAllFields || field.required)
      .map(field => field.id);
    
    // Validate current page fields
    const isValid = await trigger(fieldIds);
    
    if (isValid) {
      // Go to next page if validation passes
      setCurrentPageIndex(prev => Math.min(prev + 1, sections.length - 1));
      // Scroll to top of form
      window.scrollTo(0, 0);
    } else {
      // Show toast error if validation fails
      toast({
        title: "Please check the form",
        description: "Some required fields are missing or invalid",
        variant: "destructive",
      });
    }
  };
  
  const goToPreviousPage = () => {
    setCurrentPageIndex(prev => Math.max(prev - 1, 0));
    // Scroll to top of form
    window.scrollTo(0, 0);
  };
  
  // Style configurations based on props
  const headerBgColor = themeColor;
  const buttonClass = 
    buttonStyle === "outlined" 
      ? "border-2 border-primary bg-white text-primary hover:bg-primary/10" 
      : buttonStyle === "flat" 
        ? "bg-primary/90 hover:bg-primary text-white rounded-none" 
        : "bg-primary hover:bg-primary/90 text-white rounded-md";
  
  // Fetch available events for event-select fields
  const { data: availableEvents = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    enabled: fields.some(field => field.type === 'event-select')
  });
  
  if (submitted) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div 
          className="p-6 text-white" 
          style={{ backgroundColor: headerBgColor }}
        >
          <h1 className="text-2xl font-semibold mb-2">Registration Successful</h1>
        </div>
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">{successMessage}</p>
          <Button 
            onClick={() => navigate("/")}
            className={buttonClass}
            style={{ backgroundColor: themeColor, borderColor: themeColor }}
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }
  
  // Check if event is full
  const eventIsFull = event && event.registrationCount >= event.capacity;
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Form Header with Event Info */}
      <div 
        className="p-6 text-white" 
        style={{ backgroundColor: headerBgColor }}
      >
        <h1 className="text-2xl font-semibold mb-2">{title}</h1>
        {description && <p className="opacity-90 mb-4">{description}</p>}
      </div>
      
      {/* Registration Form */}
      <div className="p-6">
        {eventIsFull ? (
          <div className="text-center p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-2">This event is full</h2>
            <p className="text-gray-600 mb-6">
              Sorry, all spots for this event have been filled.
            </p>
            <Button 
              onClick={() => navigate("/")}
              className={buttonClass}
              style={{ backgroundColor: themeColor, borderColor: themeColor }}
            >
              Browse Other Events
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(submitForm)}>
            {/* Progress indicators */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                {sections.map((section, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "flex items-center text-center",
                      index !== 0 && "ml-4"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full mr-2",
                        index < currentPageIndex 
                          ? "bg-primary text-white" 
                          : index === currentPageIndex 
                            ? "border-2 border-primary text-primary" 
                            : "bg-gray-100 text-gray-400"
                      )}
                    >
                      {index < currentPageIndex ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <span className="text-sm hidden sm:inline">
                      {section}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${((currentPageIndex + 1) / sections.length) * 100}%`,
                    backgroundColor: themeColor
                  }}
                />
              </div>
            </div>
            
            {/* Current page section */}
            <div key={sections[currentPageIndex]} className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-6 pb-2 border-b">
                {sections[currentPageIndex] !== "Default" ? sections[currentPageIndex] : "Registration Information"}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fieldsBySection[sections[currentPageIndex]]?.map((field) => {
                  const isRequired = requireAllFields || field.required;
                  
                  return (
                    <div 
                      key={field.id} 
                      className={cn(
                        field.type === "textarea" || field.type === "event-select" ? "md:col-span-2" : ""
                      )}
                    >
                      <Label 
                        htmlFor={field.id} 
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        {field.label}
                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      
                      <Controller
                        name={field.id}
                        control={control}
                        rules={{ required: isRequired ? `${field.label} is required` : false }}
                        render={({ field: formField }) => {
                          switch (field.type) {
                            case "textarea":
                              return (
                                <Textarea
                                  id={field.id}
                                  placeholder={field.placeholder}
                                  className="w-full"
                                  rows={4}
                                  {...formField}
                                />
                              );
                            case "select":
                              return (
                                <Select
                                  onValueChange={formField.onChange}
                                  defaultValue={formField.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={field.placeholder || "Select an option"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(field.options || []).map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              );
                            case "checkbox":
                              return (
                                <div className="space-y-2">
                                  {(field.options || []).map((option) => (
                                    <div key={option} className="flex items-center">
                                      <Checkbox
                                        id={`${field.id}-${option}`}
                                        checked={formField.value.includes(option)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            formField.onChange([...formField.value, option]);
                                          } else {
                                            formField.onChange(
                                              formField.value.filter((val: string) => val !== option)
                                            );
                                          }
                                        }}
                                      />
                                      <Label
                                        htmlFor={`${field.id}-${option}`}
                                        className="ml-2 text-sm text-gray-700"
                                      >
                                        {option}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              );
                            case "radio":
                              return (
                                <RadioGroup
                                  defaultValue={formField.value}
                                  onValueChange={formField.onChange}
                                >
                                  {(field.options || []).map((option) => (
                                    <div key={option} className="flex items-center space-x-2">
                                      <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                                      <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              );
                            case "email":
                              return (
                                <Input
                                  id={field.id}
                                  type="email"
                                  placeholder={field.placeholder}
                                  className="w-full"
                                  {...formField}
                                />
                              );
                            case "phone":
                              return (
                                <Input
                                  id={field.id}
                                  type="tel"
                                  placeholder={field.placeholder}
                                  className="w-full"
                                  {...formField}
                                />
                              );
                            case "event-select":
                              // For event selection field with card-style UI
                              return (
                                <div className="space-y-4">
                                  {isPreview ? (
                                    <div className="border rounded-md p-3 bg-gray-50">
                                      <p className="text-sm text-gray-500">
                                        [In the actual form, users would select from available events using cards]
                                      </p>
                                    </div>
                                  ) : (
                                    <>
                                      {!availableEvents || availableEvents.length === 0 ? (
                                        <div className="text-sm text-gray-500 p-4 text-center border rounded-md">
                                          No events available for registration
                                        </div>
                                      ) : (
                                        <div className="grid gap-4 md:grid-cols-2">
                                          {/* Event cards selection */}
                                          {field.eventIds && field.eventIds.length > 0
                                            ? availableEvents
                                                .filter(e => field.eventIds?.includes(e.id))
                                                .map(filteredEvent => {
                                                  const isSelected = formField.value === filteredEvent.id.toString();
                                                  const availableSpots = filteredEvent.capacity - (filteredEvent as any).registrationCount || 0;
                                                  const eventDate = new Date(filteredEvent.date);
                                                  const eventFull = availableSpots <= 0;
                                                  
                                                  return (
                                                    <div
                                                      key={filteredEvent.id}
                                                      onClick={() => !eventFull && formField.onChange(filteredEvent.id.toString())}
                                                      className={cn(
                                                        "border rounded-lg overflow-hidden cursor-pointer transition-all",
                                                        eventFull ? "opacity-60 cursor-not-allowed" : "hover:shadow-md",
                                                        isSelected ? "border-2 border-primary ring-2 ring-primary/20" : "border-gray-200"
                                                      )}
                                                    >
                                                      <div className="p-4">
                                                        <div className="flex items-start justify-between">
                                                          <div>
                                                            <h4 className="font-semibold text-lg">{filteredEvent.title}</h4>
                                                            <div className="mt-1 flex items-center text-sm text-gray-600">
                                                              <Calendar className="h-4 w-4 mr-1" />
                                                              <span>{eventDate.toLocaleDateString('en-US', { 
                                                                weekday: 'short', 
                                                                month: 'short', 
                                                                day: 'numeric',
                                                                year: 'numeric' 
                                                              })}</span>
                                                            </div>
                                                          </div>
                                                          
                                                          {!eventFull && (
                                                            <div className="h-5 w-5 rounded-full border-2 border-primary flex-shrink-0 mt-1">
                                                              {isSelected && (
                                                                <div className="h-3 w-3 rounded-full bg-primary m-auto" />
                                                              )}
                                                            </div>
                                                          )}
                                                        </div>
                                                        
                                                        <div className="mt-3 space-y-2">
                                                          {filteredEvent.location && (
                                                            <div className="flex items-center text-sm text-gray-600">
                                                              <MapPin className="h-4 w-4 mr-1" />
                                                              <span>{filteredEvent.location}</span>
                                                            </div>
                                                          )}
                                                          
                                                          {filteredEvent.startTime && (
                                                            <div className="flex items-center text-sm text-gray-600">
                                                              <Clock className="h-4 w-4 mr-1" />
                                                              <span>
                                                                {filteredEvent.startTime}
                                                                {filteredEvent.endTime && ` - ${filteredEvent.endTime}`}
                                                              </span>
                                                            </div>
                                                          )}
                                                          
                                                          <div className="pt-2">
                                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                              <span>Available spots</span>
                                                              <span>
                                                                {eventFull 
                                                                  ? 'Event is full' 
                                                                  : `${availableSpots}/${filteredEvent.capacity}`}
                                                              </span>
                                                            </div>
                                                            <Progress 
                                                              value={(((filteredEvent as any).registrationCount || 0) / filteredEvent.capacity) * 100} 
                                                              className="h-2"
                                                              style={{
                                                                "--progress-background": eventFull ? "#ef4444" : "#10b981"
                                                              } as React.CSSProperties}
                                                            />
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  );
                                                })
                                            : availableEvents.map(availableEvent => {
                                                const isSelected = formField.value === availableEvent.id.toString();
                                                const availableSpots = availableEvent.capacity - ((availableEvent as any).registrationCount || 0);
                                                const eventDate = new Date(availableEvent.date);
                                                const eventFull = availableSpots <= 0;
                                                
                                                return (
                                                  <div
                                                    key={availableEvent.id}
                                                    onClick={() => !eventFull && formField.onChange(availableEvent.id.toString())}
                                                    className={cn(
                                                      "border rounded-lg overflow-hidden cursor-pointer transition-all",
                                                      eventFull ? "opacity-60 cursor-not-allowed" : "hover:shadow-md",
                                                      isSelected ? "border-2 border-primary ring-2 ring-primary/20" : "border-gray-200"
                                                    )}
                                                  >
                                                    <div className="p-4">
                                                      <div className="flex items-start justify-between">
                                                        <div>
                                                          <h4 className="font-semibold text-lg">{availableEvent.title}</h4>
                                                          <div className="mt-1 flex items-center text-sm text-gray-600">
                                                            <Calendar className="h-4 w-4 mr-1" />
                                                            <span>{eventDate.toLocaleDateString('en-US', { 
                                                              weekday: 'short', 
                                                              month: 'short', 
                                                              day: 'numeric',
                                                              year: 'numeric' 
                                                            })}</span>
                                                          </div>
                                                        </div>
                                                        
                                                        {!eventFull && (
                                                          <div className="h-5 w-5 rounded-full border-2 border-primary flex-shrink-0 mt-1">
                                                            {isSelected && (
                                                              <div className="h-3 w-3 rounded-full bg-primary m-auto" />
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                      
                                                      <div className="mt-3 space-y-2">
                                                        {availableEvent.location && (
                                                          <div className="flex items-center text-sm text-gray-600">
                                                            <MapPin className="h-4 w-4 mr-1" />
                                                            <span>{availableEvent.location}</span>
                                                          </div>
                                                        )}
                                                        
                                                        {availableEvent.startTime && (
                                                          <div className="flex items-center text-sm text-gray-600">
                                                            <Clock className="h-4 w-4 mr-1" />
                                                            <span>
                                                              {availableEvent.startTime}
                                                              {availableEvent.endTime && ` - ${availableEvent.endTime}`}
                                                            </span>
                                                          </div>
                                                        )}
                                                        
                                                        <div className="pt-2">
                                                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                            <span>Available spots</span>
                                                            <span>
                                                              {eventFull 
                                                                ? 'Event is full' 
                                                                : `${availableSpots}/${availableEvent.capacity}`}
                                                            </span>
                                                          </div>
                                                          <Progress 
                                                            value={(((availableEvent as any).registrationCount || 0) / availableEvent.capacity) * 100} 
                                                            className="h-2"
                                                            style={{
                                                              "--progress-background": eventFull ? "#ef4444" : "#10b981"
                                                            } as React.CSSProperties}
                                                          />
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })
                                          }
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            default:
                              return (
                                <Input
                                  id={field.id}
                                  type="text"
                                  placeholder={field.placeholder}
                                  className="w-full"
                                  {...formField}
                                />
                              );
                          }
                        }}
                      />
                      
                      {errors[field.id] && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors[field.id]?.message as string}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Navigation buttons */}
            <div className="flex justify-between mt-8">
              {currentPageIndex > 0 ? (
                <Button
                  type="button"
                  onClick={goToPreviousPage}
                  variant="outline"
                  className="flex items-center"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              ) : (
                <div></div> 
              )}
              
              {currentPageIndex < sections.length - 1 ? (
                <Button
                  type="button"
                  onClick={goToNextPage}
                  className={cn(buttonClass, "flex items-center")}
                  style={{ backgroundColor: themeColor, borderColor: themeColor }}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className={cn(buttonClass, "flex items-center")}
                  style={{ backgroundColor: themeColor, borderColor: themeColor }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Registration"}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}