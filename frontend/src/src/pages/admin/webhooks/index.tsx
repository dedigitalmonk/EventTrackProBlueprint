import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { webhookEventTypes, type Webhook } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Copy, Edit, Link, Plus, Trash, Send } from "lucide-react";

// Create form schema
const webhookFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  url: z.string().url({ message: "Please enter a valid URL" }),
  secret: z.string().optional(),
  events: z.array(z.string()).min(1, { message: "Select at least one event" }),
  active: z.boolean().default(true),
});

type WebhookFormValues = z.infer<typeof webhookFormSchema>;

const WebhooksPage = () => {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);

  const { data: webhooks, isLoading } = useQuery<Webhook[]>({
    queryKey: ["/api/webhooks"],
  });

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (data: WebhookFormValues) => {
      const response = await apiRequest("POST", "/api/webhooks", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setIsCreateOpen(false);
      toast({
        title: "Webhook created",
        description: "Your webhook has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create webhook",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Update webhook mutation
  const updateWebhookMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: WebhookFormValues;
    }) => {
      const response = await apiRequest("PUT", `/api/webhooks/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setEditingWebhook(null);
      toast({
        title: "Webhook updated",
        description: "Your webhook has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update webhook",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setWebhookToDelete(null);
      toast({
        title: "Webhook deleted",
        description: "Your webhook has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete webhook",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Test webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: async (webhook: Webhook) => {
      // Determine which event type to use for the test (use first event from list)
      const webhookEvents = webhook.events as string[] || [];
      const eventType = webhookEvents.length > 0 
        ? webhookEvents[0] 
        : 'registration.created';
        
      // Create sample data based on event type
      let testData: Record<string, any> = {};
      
      if (eventType === 'registration.created') {
        testData = {
          registration_id: 999,
          event_id: 1,
          event_title: "Test Event",
          participant_name: "Test Participant",
          participant_email: "test@example.com",
          registration_date: new Date().toISOString(),
          form_data: {
            first_name: "Test",
            last_name: "Participant",
            email: "test@example.com",
            phone: "555-555-5555"
          }
        };
      } else if (eventType === 'attendance.updated') {
        testData = {
          event_id: 1,
          event_title: "Test Event",
          participant_name: "Test Participant",
          participant_email: "test@example.com",
          registration_id: 999,
          attendance_status: "Attended",
          previous_status: "Not Specified",
          notes: "Test attendance note",
          updated_at: new Date().toISOString()
        };
      } else {
        // Generic test data for other event types
        testData = {
          id: 1,
          title: "Test Event",
          timestamp: new Date().toISOString(),
          test: true
        };
      }
      
      const response = await apiRequest("POST", "/api/webhooks/test", {
        webhookId: webhook.id,
        eventType,
        data: testData
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test webhook sent",
        description: "A test payload has been sent to the webhook URL",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to send test webhook",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  });

  // Create form
  const createForm = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      name: "",
      url: "",
      secret: "",
      events: [],
      active: true,
    },
  });

  // Edit form
  const editForm = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      name: "",
      url: "",
      secret: "",
      events: [],
      active: true,
    },
  });

  // Set edit form values when editing webhook changes
  useEffect(() => {
    if (editingWebhook) {
      editForm.reset({
        name: editingWebhook.name,
        url: editingWebhook.url,
        secret: editingWebhook.secret || "",
        events: editingWebhook.events as string[] || [],
        active: typeof editingWebhook.active === 'boolean' ? editingWebhook.active : true,
      });
    }
  }, [editingWebhook, editForm]);

  const onCreateSubmit = (data: WebhookFormValues) => {
    createWebhookMutation.mutate(data);
  };

  const onEditSubmit = (data: WebhookFormValues) => {
    if (editingWebhook) {
      updateWebhookMutation.mutate({ id: editingWebhook.id, data });
    }
  };

  const handleDeleteWebhook = () => {
    if (webhookToDelete) {
      deleteWebhookMutation.mutate(webhookToDelete.id);
    }
  };

  // Function to copy webhook URL to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The webhook URL has been copied to your clipboard",
    });
  };

  const getEventTypeName = (eventType: string) => {
    switch (eventType) {
      case "registration.created":
        return "Registration Created";
      case "event.created":
        return "Event Created";
      case "event.updated":
        return "Event Updated";
      case "attendance.updated":
        return "Attendance Updated";
      default:
        return eventType;
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Zapier Webhooks"
        description="Manage webhooks for Zapier integration"
        action={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Webhook
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center my-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : webhooks && webhooks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {webhooks.map((webhook) => (
            <Card key={webhook.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span
                    className={
                      webhook.active ? "text-primary" : "text-gray-400"
                    }
                  >
                    {webhook.name}
                  </span>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      webhook.active ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">URL</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(webhook.url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {webhook.url}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Events</div>
                    <div className="flex flex-wrap gap-2">
                      {(webhook.events as string[]).map((event) => (
                        <div
                          key={event}
                          className="text-xs bg-primary/10 text-primary rounded-full px-2 py-1"
                        >
                          {getEventTypeName(event)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Created: {format(new Date(webhook.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 mt-auto pt-4 border-t">
                <div className="flex justify-between w-full">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingWebhook(webhook)}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setWebhookToDelete(webhook)}
                  >
                    <Trash className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                        onClick={() => testWebhookMutation.mutate(webhook)}
                        disabled={!webhook.active || testWebhookMutation.isPending}
                      >
                        {testWebhookMutation.isPending && (
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                        )}
                        <Send className="h-4 w-4 mr-2" /> Send Test Hook
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Send a test payload to this webhook</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg border p-8 text-center">
          <div className="flex justify-center mb-4">
            <Link className="w-12 h-12 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            No webhooks found
          </h3>
          <p className="text-gray-500 mb-6">
            Create your first webhook to integrate with Zapier and other services
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>Create Webhook</Button>
        </div>
      )}

      {/* Create Webhook Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Create a new webhook to integrate with Zapier and other services
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(onCreateSubmit)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Zapier Integration" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://hooks.zapier.com/hooks/catch/..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Secret Key (optional but recommended for security)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter a secret key for signature verification"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="events"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Events</FormLabel>
                    </div>
                    <div className="space-y-2">
                      {webhookEventTypes.map((event) => (
                        <FormField
                          key={event}
                          control={createForm.control}
                          name="events"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={event}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(event)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            event,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== event
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {getEventTypeName(event)}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createWebhookMutation.isPending}
                >
                  {createWebhookMutation.isPending && (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                  Create Webhook
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Webhook Dialog */}
      <Dialog
        open={!!editingWebhook}
        onOpenChange={(open) => !open && setEditingWebhook(null)}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>
              Update your webhook configuration
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Zapier Integration" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://hooks.zapier.com/hooks/catch/..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Secret Key (optional but recommended for security)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter a secret key for signature verification"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="events"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Events</FormLabel>
                    </div>
                    <div className="space-y-2">
                      {webhookEventTypes.map((event) => (
                        <FormField
                          key={event}
                          control={editForm.control}
                          name="events"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={event}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(event)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            event,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== event
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {getEventTypeName(event)}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingWebhook(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateWebhookMutation.isPending}
                >
                  {updateWebhookMutation.isPending && (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                  Update Webhook
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!webhookToDelete}
        onOpenChange={(open) => !open && setWebhookToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the webhook and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWebhook}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteWebhookMutation.isPending && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default WebhooksPage;