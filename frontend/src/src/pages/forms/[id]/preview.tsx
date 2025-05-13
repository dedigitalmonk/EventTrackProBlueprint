import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { Form } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Loader2, X, ArrowLeft, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FormPreviewPage = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const formId = parseInt(id as string);
  
  const { data: form, isLoading, error } = useQuery<Form>({
    queryKey: [`/api/forms/${formId}`],
    enabled: !isNaN(formId),
    retry: 1,
  });
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <p className="mt-4 text-lg text-gray-600">Loading form preview...</p>
      </div>
    );
  }
  
  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
        <p className="text-gray-600 mb-6">The form you're trying to preview doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/admin/forms")}>Back to Forms</Button>
      </div>
    );
  }
  
  // For preview mode, just log the submission data
  const handleSubmit = (data: any) => {
    toast({
      title: "Preview Mode",
      description: "Form submissions in preview mode are not saved.",
    });
    console.log("Preview form data:", data);
  };
  
  // Generate public view link
  const viewLink = `/forms/${form.id}/view`;
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header with controls */}
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/forms/${form.id}`)} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
          
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="flex items-center">
              <Link href={viewLink} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Public View
              </Link>
            </Button>
            
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/forms")} className="flex items-center">
              <X className="h-4 w-4 mr-2" />
              Close Preview
            </Button>
          </div>
        </div>
        
        {/* Preview Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Preview Mode:</strong> This is a preview of how your form will appear to users. 
                Submissions made here are not saved to the database.
              </p>
            </div>
          </div>
        </div>
        
        {/* Form rendering */}
        <FormRenderer
          title={form.title}
          description={form.description}
          fields={form.fields}
          themeColor={form.themeColor}
          buttonStyle={form.buttonStyle}
          requireAllFields={form.requireAllFields}
          successMessage={form.successMessage}
          onSubmit={handleSubmit}
          isPreview={true}
        />
      </div>
    </div>
  );
};

export default FormPreviewPage;