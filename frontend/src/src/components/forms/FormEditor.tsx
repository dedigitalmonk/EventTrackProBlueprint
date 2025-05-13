import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { insertFormSchema, formFieldSchema, FormField } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFormBuilder } from "@/hooks/useFormBuilder";
import { FormFieldEditor } from "./FormFieldEditor";
import { FormRenderer } from "./FormRenderer";
import { fieldTypeOptions } from "./fieldTypes";
import { Form, FormControl, FormDescription, FormField as UIFormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  successMessage: z.string().optional(),
  showRemainingSpots: z.boolean().default(true),
  enableWaitlist: z.boolean().default(false),
  requireAllFields: z.boolean().default(true),
  themeColor: z.string().default("#3B82F6"),
  buttonStyle: z.string().default("rounded"),
  fields: z.array(formFieldSchema),
  createdAt: z.string().optional(), // Added to make the form compatible with the database schema
});

type FormValues = z.infer<typeof formSchema>;

interface FormEditorProps {
  formId?: string;
  isNew?: boolean;
  defaultValues?: FormValues;
}

export function FormEditor({ formId, isNew = false, defaultValues }: FormEditorProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("fields");
  const [previewMode, setPreviewMode] = useState(false);
  
  const { fields, addField, updateField, removeField, reorderFields } = useFormBuilder(
    defaultValues?.fields || [
      // Default basic fields if no fields are provided
      {
        id: uuidv4(),
        type: "text",
        label: "First Name",
        placeholder: "Enter your first name",
        required: true,
        section: "Basic Information",
      },
      {
        id: uuidv4(),
        type: "text",
        label: "Last Name",
        placeholder: "Enter your last name",
        required: true,
        section: "Basic Information",
      },
      {
        id: uuidv4(),
        type: "email",
        label: "Email",
        placeholder: "Enter your email address",
        required: true,
        section: "Basic Information",
      },
      {
        id: uuidv4(),
        type: "phone",
        label: "Phone",
        placeholder: "Enter your phone number",
        required: true,
        section: "Basic Information",
      },
    ]
  );
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      title: "",
      description: "",
      successMessage: "Thank you for registering! We'll send you a confirmation email with all the details.",
      showRemainingSpots: true,
      enableWaitlist: false,
      requireAllFields: true,
      themeColor: "#3B82F6",
      buttonStyle: "rounded",
      fields: fields,
    },
  });
  
  // Set the current fields from the form builder to the form's fields value
  form.setValue("fields", fields);
  
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      console.log("Creating form with data:", data);
      const response = await apiRequest("POST", '/api/forms', data);
      console.log("Create response:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("Form created successfully:", data);
      toast({
        title: "Form created successfully",
        description: "Your form has been created and is ready to be linked to events.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      navigate("/admin/forms");
    },
    onError: (error) => {
      console.error("Form creation error:", error);
      toast({
        title: "Failed to create form",
        description: "An unexpected error occurred while creating the form",
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      console.log("Updating form with ID:", formId, "and data:", data);
      const response = await apiRequest("PUT", `/api/forms/${formId}`, data);
      console.log("Update response:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("Form updated successfully:", data);
      toast({
        title: "Form updated successfully",
        description: "Your form has been updated with the new information.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      queryClient.invalidateQueries({ queryKey: [`/api/forms/${formId}`] });
      navigate("/admin/forms");
    },
    onError: (error) => {
      console.error("Form update error:", error);
      toast({
        title: "Failed to update form",
        description: "An unexpected error occurred while updating the form",
        variant: "destructive",
      });
    },
  });
  
  // Directly save the form using a fetch call rather than complex mutations
  const saveForm = async () => {
    try {
      // Gather all form data
      const data = {
        ...form.getValues(),
        fields: fields, // Make sure to include the current fields
      };
      
      console.log("Saving form with data:", data);
      
      const url = isNew || !formId 
        ? '/api/forms' 
        : `/api/forms/${formId}`;
      
      const method = isNew || !formId ? 'POST' : 'PUT';
      
      // Direct fetch call to avoid any middleware issues
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Form saved successfully:", result);
      
      toast({
        title: isNew ? "Form created successfully" : "Form updated successfully",
        description: isNew 
          ? "Your form has been created and is ready to be linked to events." 
          : "Your form has been updated with the new information.",
      });
      
      // Refresh the form list and navigate back
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      if (!isNew && formId) {
        queryClient.invalidateQueries({ queryKey: [`/api/forms/${formId}`] });
      }
      
      navigate("/admin/forms");
    } catch (error) {
      console.error("Error saving form:", error);
      toast({
        title: isNew ? "Failed to create form" : "Failed to update form",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const onSubmit = (data: FormValues) => {
    console.log("Form submission triggered");
    console.log("Current form data:", data);
    console.log("Current form fields:", fields);
    
    // Ensure fields are saved from the form builder
    form.setValue("fields", fields);
    
    // Save the form directly
    saveForm();
  };
  
  const handleAddField = () => {
    const newField: FormField = {
      id: uuidv4(),
      type: "text",
      label: "New Field",
      placeholder: "Enter value",
      required: true,
    };
    
    addField(newField);
  };
  
  if (previewMode) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Form Preview</h2>
          <Button onClick={() => setPreviewMode(false)}>
            Return to Editor
          </Button>
        </div>
        
        <FormRenderer
          title={form.getValues("title")}
          description={form.getValues("description")}
          fields={fields}
          themeColor={form.getValues("themeColor")}
          buttonStyle={form.getValues("buttonStyle")}
          requireAllFields={form.getValues("requireAllFields")}
          onSubmit={(data) => {
            console.log("Preview form submitted:", data);
            toast({
              title: "Form Submitted (Preview)",
              description: "This is just a preview. In actual use, this form would submit the data to your server.",
            });
          }}
          isPreview
        />
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Form Editor</h2>
          <Button onClick={() => setPreviewMode(true)}>
            Preview Form
          </Button>
        </div>
        
        <Tabs defaultValue="fields" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="fields">Form Fields</TabsTrigger>
            <TabsTrigger value="properties">Form Properties</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="fields" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <FormFieldEditor
                      key={field.id}
                      field={field}
                      onUpdate={(updatedField) => updateField(field.id, updatedField)}
                      onRemove={() => removeField(field.id)}
                      onMoveUp={index > 0 ? () => reorderFields(index, index - 1) : undefined}
                      onMoveDown={index < fields.length - 1 ? () => reorderFields(index, index + 1) : undefined}
                    />
                  ))}
                  
                  <Button 
                    variant="outline" 
                    onClick={handleAddField}
                    className="w-full py-6 border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center"
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Add New Field
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="properties">
            <Card>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <UIFormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Form Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Event Registration Form" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <UIFormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the purpose of this form..." 
                              rows={3} 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <UIFormField
                      control={form.control}
                      name="successMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Success Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Message to display after successful submission..." 
                              rows={2} 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            This message will be shown to users after they submit the form.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="font-medium text-sm text-gray-700 mb-3">Display Options</h3>
                      
                      <div className="space-y-4">
                        <UIFormField
                          control={form.control}
                          name="showRemainingSpots"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel>Show remaining spots</FormLabel>
                                <FormDescription>
                                  Display the number of available spots for the event.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <UIFormField
                          control={form.control}
                          name="enableWaitlist"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel>Enable waitlist</FormLabel>
                                <FormDescription>
                                  Allow registrations even when the event is full.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <UIFormField
                          control={form.control}
                          name="requireAllFields"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div>
                                <FormLabel>Require all fields</FormLabel>
                                <FormDescription>
                                  Make all fields required by default.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {createMutation.isPending || updateMutation.isPending ? (
                          <div className="flex items-center">
                            <span className="mr-2">
                              {isNew ? "Creating..." : "Saving..."}
                            </span>
                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          isNew ? "Create Form" : "Save Form"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="appearance">
            <Card>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <UIFormField
                      control={form.control}
                      name="themeColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme Color</FormLabel>
                          <div className="flex space-x-2">
                            {["#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B", "#374151"].map((color) => (
                              <div 
                                key={color}
                                className={`w-6 h-6 rounded-full cursor-pointer ${
                                  field.value === color ? "ring-2 ring-offset-2" : ""
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => form.setValue("themeColor", color)}
                              />
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <UIFormField
                      control={form.control}
                      name="buttonStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button Style</FormLabel>
                          <Select 
                            value={field.value} 
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a button style" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rounded">Rounded</SelectItem>
                              <SelectItem value="outlined">Outlined</SelectItem>
                              <SelectItem value="flat">Flat</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {createMutation.isPending || updateMutation.isPending ? (
                          <div className="flex items-center">
                            <span className="mr-2">
                              {isNew ? "Creating..." : "Saving..."}
                            </span>
                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          isNew ? "Create Form" : "Save Form"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <div>
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            
            <div className="space-y-4">
              <Button 
                className="w-full" 
                onClick={saveForm}
              >
                {isNew ? "Create Form" : "Save Form"}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/admin/forms")}
              >
                Cancel
              </Button>
            </div>
            
            <div className="mt-8">
              <h3 className="font-medium text-sm text-gray-700 mb-3">Connected Events</h3>
              <p className="text-sm text-gray-500">
                {isNew 
                  ? "You can connect this form to events after saving." 
                  : "This form is not connected to any events yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default FormEditor;
