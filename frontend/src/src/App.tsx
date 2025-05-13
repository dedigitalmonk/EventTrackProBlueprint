import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/admin/dashboard";
import EventsPage from "@/pages/admin/events/index";
import NewEventPage from "@/pages/admin/events/new";
import EventDetailPage from "@/pages/admin/events/[id]";
import RegistrationsPage from "@/pages/admin/registrations/index";
import FormsPage from "@/pages/admin/forms/index";
import FormEditorPage from "@/pages/admin/forms/[id]";
import WebhooksPage from "@/pages/admin/webhooks/index";
import AccountPage from "@/pages/admin/account";
import LoginPage from "@/pages/login";
import EventRegistrationPage from "@/pages/events/[id]/register";
import FormViewPage from "@/pages/forms/[id]/view";
import FormPreviewPage from "@/pages/forms/[id]/preview";
import ThankYouPage from "@/pages/thank-you";
import { useAuth } from "@/hooks/useAuth";

// Protected route wrapper component
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, path: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user is authenticated
  if (isLoading) {
    // Loading state
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // We use setTimeout to ensure redirect happens after render
    setTimeout(() => setLocation("/login"), 0);
    return null;
  }

  // Render the protected component
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      {/* Authentication Routes */}
      <Route path="/login" component={LoginPage} />
      
      {/* Admin Dashboard Routes - Protected */}
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} path="/" />}
      </Route>
      
      <Route path="/admin">
        {() => <ProtectedRoute component={Dashboard} path="/admin" />}
      </Route>
      
      <Route path="/admin/dashboard">
        {() => <ProtectedRoute component={Dashboard} path="/admin/dashboard" />}
      </Route>
      
      <Route path="/admin/account">
        {() => <ProtectedRoute component={AccountPage} path="/admin/account" />}
      </Route>
      
      <Route path="/admin/events">
        {() => <ProtectedRoute component={EventsPage} path="/admin/events" />}
      </Route>
      
      <Route path="/admin/events/new">
        {() => <ProtectedRoute component={NewEventPage} path="/admin/events/new" />}
      </Route>
      
      <Route path="/admin/events/:id">
        {(params) => <ProtectedRoute component={EventDetailPage} path={`/admin/events/${params.id}`} />}
      </Route>
      
      <Route path="/admin/registrations">
        {() => <ProtectedRoute component={RegistrationsPage} path="/admin/registrations" />}
      </Route>
      
      <Route path="/admin/forms">
        {() => <ProtectedRoute component={FormsPage} path="/admin/forms" />}
      </Route>
      
      <Route path="/admin/forms/new">
        {() => <ProtectedRoute component={FormEditorPage} path="/admin/forms/new" />}
      </Route>
      
      <Route path="/admin/forms/:id">
        {(params) => <ProtectedRoute component={FormEditorPage} path={`/admin/forms/${params.id}`} />}
      </Route>
      
      <Route path="/admin/webhooks">
        {() => <ProtectedRoute component={WebhooksPage} path="/admin/webhooks" />}
      </Route>
      
      {/* Public Routes */}
      <Route path="/events/:id/register" component={EventRegistrationPage} />
      <Route path="/forms/:id/view" component={FormViewPage} />
      <Route path="/forms/:id/preview" component={FormPreviewPage} />
      <Route path="/thank-you" component={ThankYouPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
