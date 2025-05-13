import { useLocation } from "wouter";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const ThankYouPage = () => {
  const [_, navigate] = useLocation();
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Registration Successful!</CardTitle>
          <CardDescription>
            Thank you for registering for our event
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center pb-2">
          <p className="text-gray-600">
            We've sent a confirmation email with all the details.
            Please check your inbox for further instructions.
          </p>
        </CardContent>
        
        <CardFooter className="flex justify-center pt-2">
          <Button 
            onClick={() => navigate("/")}
            className="bg-primary hover:bg-primary/90"
          >
            Return to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ThankYouPage;
