import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Edit, MoreVertical, Calendar, Trash, ExternalLink, Eye } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import { Form, FormField } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const FormsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteFormId, setDeleteFormId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { data: forms, isLoading } = useQuery<Form[]>({
    queryKey: ["/api/forms"],
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (formId: number) => {
      return await apiRequest("DELETE", `/api/forms/${formId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Form deleted",
        description: "The form has been successfully deleted.",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error("Failed to delete form:", error);
      toast({
        title: "Error",
        description: "Failed to delete the form. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleDeleteClick = (formId: number) => {
    setDeleteFormId(formId);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (deleteFormId) {
      deleteMutation.mutate(deleteFormId);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <PageHeader
          title="Forms"
          description="Create and manage registration forms"
          action={
            <Button asChild>
              <Link href="/admin/forms/new" className="flex items-center">
                <Plus className="mr-2 h-4 w-4" /> New Form
              </Link>
            </Button>
          }
        />
        
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-8 flex justify-center">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Loading forms...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!forms || forms.length === 0) {
    return (
      <AdminLayout>
        <PageHeader
          title="Forms"
          description="Create and manage registration forms"
          action={
            <Button asChild>
              <Link href="/admin/forms/new" className="flex items-center">
                <Plus className="mr-2 h-4 w-4" /> New Form
              </Link>
            </Button>
          }
        />
        
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-8 text-center">
          <h3 className="text-lg font-medium text-gray-800 mb-2">No forms found</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first form</p>
          <Button asChild>
            <Link href="/admin/forms/new">Create Form</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Forms"
        description="Create and manage registration forms"
        action={
          <Button asChild>
            <Link href="/admin/forms/new" className="flex items-center">
              <Plus className="mr-2 h-4 w-4" /> New Form
            </Link>
          </Button>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map((form) => (
          <Card key={form.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{form.title}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/forms/${form.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit form
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/forms/${form.id}/view`} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Share form
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/forms/${form.id}/preview`}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview form
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => handleDeleteClick(form.id)}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete form
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription>
                {form.description || "No description"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">
                <div className="flex items-center mb-2">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Created: {format(new Date(form.createdAt), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">Fields:</span>
                  <span>{Array.isArray(form.fields) ? form.fields.length : 0}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="mt-auto pt-2 border-t flex justify-between">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/admin/forms/${form.id}`}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/forms/${form.id}/preview`}>
                  Preview
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the form
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default FormsPage;
