import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { User } from '@shared/schema';
import { toast } from '@/hooks/use-toast';

interface AuthResponse {
  user: Omit<User, 'password_hash'>;
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery<AuthResponse>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const user = data?.user;
  const isAuthenticated = !!user;

  const login = async (username: string, password: string) => {
    try {
      await apiRequest('POST', '/api/auth/login', { username, password });
      
      // Refetch user data after login
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Please check your credentials and try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      
      // Clear user data after logout
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.invalidateQueries();
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    error,
  };
}