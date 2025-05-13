import { useState } from "react";
import { FormField, Event } from "@shared/schema";
import { fieldTypeOptions, suggestedSections } from "./fieldTypes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  GripVertical,
  MoreVertical,
  X,
  Calendar,
  LayoutTemplate
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Component for selecting events
interface EventSelectorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
}

function EventSelector({ field, onUpdate }: EventSelectorProps) {
  const { data: events, isLoading } = useQuery<(Event & { registrationCount: number })[]>({
    queryKey: ['/api/events'],
  });
  
  const selectedEventIds = field.eventIds || [];
  
  const toggleEvent = (eventId: number) => {
    let newEventIds: number[];
    
    if (selectedEventIds.includes(eventId)) {
      newEventIds = selectedEventIds.filter(id => id !== eventId);
    } else {
      newEventIds = [...selectedEventIds, eventId];
    }
    
    onUpdate({ ...field, eventIds: newEventIds });
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <Label className="text-base font-semibold">Available Events</Label>
        <div className="text-xs text-gray-500">Select the events that registrants can choose from</div>
      </div>
      
      {isLoading ? (
        <div className="text-sm text-gray-500 p-4 text-center border rounded-md">
          Loading events...
        </div>
      ) : !events || events.length === 0 ? (
        <div className="text-sm text-gray-500 p-4 text-center border rounded-md">
          No events available. Create some events first.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map(event => {
            const isSelected = selectedEventIds.includes(event.id);
            const availableSpots = event.capacity - (event.registrationCount || 0);
            const eventDate = new Date(event.date);
            
            return (
              <div 
                key={event.id} 
                className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
                }`}
                onClick={() => toggleEvent(event.id)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg truncate">{event.title}</h4>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{eventDate.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric' 
                        })}</span>
                      </div>
                    </div>
                    <Checkbox
                      className="h-5 w-5 mt-1"
                      checked={isSelected}
                      onCheckedChange={() => toggleEvent(event.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <div className="mt-3 space-y-1">
                    {event.location && (
                      <div className="text-sm">
                        <span className="font-medium">Location:</span> {event.location}
                      </div>
                    )}
                    
                    {event.startTime && (
                      <div className="text-sm">
                        <span className="font-medium">Time:</span> {event.startTime}
                        {event.endTime && ` - ${event.endTime}`}
                      </div>
                    )}
                    
                    <div className="text-sm">
                      <span className="font-medium">Spots:</span>{' '}
                      <span className={availableSpots < 5 ? 'text-red-500 font-semibold' : ''}>
                        {availableSpots} available
                      </span> of {event.capacity} total
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FormFieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function FormFieldEditor({ 
  field, 
  onUpdate, 
  onRemove,
  onMoveUp,
  onMoveDown
}: FormFieldEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleChange = (key: keyof FormField, value: any) => {
    onUpdate({ ...field, [key]: value });
  };
  
  const addOption = () => {
    const options = [...(field.options || []), "New Option"];
    onUpdate({ ...field, options });
  };
  
  const updateOption = (index: number, value: string) => {
    if (!field.options) return;
    const options = [...field.options];
    options[index] = value;
    onUpdate({ ...field, options });
  };
  
  const removeOption = (index: number) => {
    if (!field.options) return;
    const options = field.options.filter((_, i) => i !== index);
    onUpdate({ ...field, options });
  };
  
  return (
    <Card className="border border-gray-200 bg-white hover:border-gray-300">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <GripVertical className="h-5 w-5 text-gray-400 cursor-move mr-2" />
            <span className="font-medium">{field.label || "Untitled Field"}</span>
            <span className="ml-2 text-sm text-gray-500">({field.type})</span>
          </div>
          
          <div className="flex items-center space-x-1">
            {onMoveUp && (
              <Button variant="ghost" size="icon" onClick={onMoveUp}>
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
            
            {onMoveDown && (
              <Button variant="ghost" size="icon" onClick={onMoveDown}>
                <ArrowDown className="h-4 w-4" />
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <X className="h-4 w-4" />
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`${field.id}-label`}>Field Label</Label>
                <Input
                  id={`${field.id}-label`}
                  value={field.label}
                  onChange={(e) => handleChange("label", e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor={`${field.id}-type`}>Field Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(value) => handleChange("type", value)}
                >
                  <SelectTrigger id={`${field.id}-type`} className="mt-1">
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor={`${field.id}-placeholder`}>Placeholder Text</Label>
              <Input
                id={`${field.id}-placeholder`}
                value={field.placeholder || ""}
                onChange={(e) => handleChange("placeholder", e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor={`${field.id}-section`}>
                  <div className="flex items-center">
                    <LayoutTemplate className="h-4 w-4 mr-2" />
                    Form Section/Page
                  </div>
                </Label>
                <div className="text-xs text-gray-500 italic">
                  Fields with the same section appear on the same page
                </div>
              </div>
              <div className="mt-1">
                <Select
                  value={field.section || ""}
                  onValueChange={(value) => handleChange("section", value)}
                >
                  <SelectTrigger id={`${field.id}-section`}>
                    <SelectValue placeholder="Choose a section or page" />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestedSections.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                    <SelectItem value=" ">No Section (Default)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-2 flex items-center gap-2">
                  <div className="text-xs text-gray-500">Or enter custom name:</div>
                  <Input
                    placeholder="Custom section name"
                    value={field.section || ""}
                    onChange={(e) => handleChange("section", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Fields are grouped by section into separate pages in multi-page forms
              </div>
            </div>
            
            {(field.type === "select" || field.type === "checkbox" || field.type === "radio") && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Options</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addOption}
                  >
                    Add Option
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {(field.options || []).map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {(!field.options || field.options.length === 0) && (
                    <div className="text-sm text-gray-500">
                      No options added yet. Click "Add Option" to add some.
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {field.type === "event-select" && (
              <EventSelector field={field} onUpdate={onUpdate} />
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`${field.id}-required`}
                checked={field.required}
                onCheckedChange={(checked) => handleChange("required", checked)}
              />
              <Label htmlFor={`${field.id}-required`}>Required field</Label>
            </div>
            
            <div className="pt-2 border-t flex justify-end">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={onRemove}
                className="flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remove Field
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
