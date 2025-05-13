import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FormEditor } from "@/components/forms/FormEditor";
import { Form } from "@shared/schema";

import type { RouteComponentProps } from "wouter";

interface FormEditorPageProps {
  isNew?: boolean;
  params?: any; // This handles route parameters from wouter
}

const FormEditorPage = ({ isNew = false, params }: FormEditorPageProps) => {
  const { id } = params || useParams();
  
  const { data: form, isLoading } = useQuery<Form>({
    queryKey: [`/api/forms/${id}`],
    enabled: !isNew && !!id,
  });
  
  const title = isNew 
    ? "Create New Form" 
    : form 
      ? `Edit Form: ${form.title}` 
      : "Edit Form";
  
  const description = isNew
    ? "Design a new registration form for your events"
    : "Modify your existing registration form";

  if (!isNew && isLoading) {
    return (
      <AdminLayout>
        <PageHeader
          title={<Skeleton className="h-8 w-64" />}
          description={<Skeleton className="h-4 w-48" />}
        />
        
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }
  
  if (!isNew && !form) {
    return (
      <AdminLayout>
        <PageHeader
          title="Form Not Found"
          description="The form you're looking for doesn't exist or has been removed."
          action={
            <Button asChild>
              <a href="/admin/forms">Back to Forms</a>
            </Button>
          }
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title={title}
        description={description}
      />
      
      <FormEditor 
        formId={id} 
        isNew={isNew} 
        defaultValues={form} 
      />
    </AdminLayout>
  );
};

export default FormEditorPage;
