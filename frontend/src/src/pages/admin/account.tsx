import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AccountPage() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update form data when user is loaded
  if (user && user.username && !formData.username) {
    setFormData(prev => ({ ...prev, username: user.username }));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match if changing password
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'Passwords don\'t match',
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      });
      return;
    }
    
    // Need current password to make changes
    if (!formData.currentPassword) {
      toast({
        title: 'Current password required',
        description: 'Please enter your current password to make changes.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const payload: Record<string, string> = {
        currentPassword: formData.currentPassword,
      };
      
      // Only include fields that are being updated
      if (formData.username !== user?.username) {
        payload.username = formData.username;
      }
      
      if (formData.newPassword) {
        payload.newPassword = formData.newPassword;
      }
      
      await apiRequest('PUT', '/api/auth/account', payload);
      
      // Reset form and show success message
      setFormData({
        username: formData.username,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Invalidate user query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: 'Account updated',
        description: 'Your account information has been updated successfully.',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Could not update your account information.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AdminLayout title="Account Settings">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Update your username and password
            </CardDescription>
          </CardHeader>
          {isLoading ? (
            <CardContent className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Username"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    placeholder="Enter your current password"
                  />
                </div>
                
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-3">Change Password</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="Enter new password"
                    />
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button 
                  type="submit" 
                  disabled={isUpdating || !formData.currentPassword}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}