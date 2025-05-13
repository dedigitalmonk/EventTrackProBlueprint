import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Standard headers for all requests
  const headers: HeadersInit = {
    'Accept': 'application/json',
  };
  
  // Add Content-Type for requests with body
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  // For production environments, add CSRF protection if needed
  // (This is a common requirement for deployed applications)
  if (import.meta.env.PROD) {
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Always include credentials for cross-domain requests
    mode: 'cors',           // Enable CORS for cross-domain requests
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Standard headers for all requests
      const headers: HeadersInit = {
        'Accept': 'application/json',
      };
      
      // For production environments, add CSRF protection if needed
      if (import.meta.env.PROD) {
        headers['X-Requested-With'] = 'XMLHttpRequest';
      }
    
      const res = await fetch(queryKey[0] as string, {
        headers,
        credentials: "include",
        mode: 'cors' // Enable CORS for cross-domain requests in production
      });

      if (res.status === 401) {
        if (unauthorizedBehavior === "returnNull") {
          return null;
        } else {
          // For auth endpoints, don't throw the error to avoid console warnings
          if (queryKey[0] === '/api/auth/me') {
            return null;
          }
          throw new Error("Unauthorized");
        }
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // If this is an auth endpoint query, don't propagate the error
      if (queryKey[0] === '/api/auth/me') {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
