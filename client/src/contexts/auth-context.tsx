import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useGoogleLogin } from "@react-oauth/google";
import { trackEvent, Events } from "@/lib/amplitude";

// Enhanced User interface with optional Google profile fields
interface User {
  id: number;
  username: string;
  email: string;
  picture?: string; // Profile picture URL
  name?: string;    // Full name from Google
}

interface LoginResponse {
  message: string;
  user: User;
}

interface GoogleLoginResponse {
  message: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch current user
  const { data, isLoading: isUserLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  useEffect(() => {
    if (!isUserLoading) {
      setUser(data as User | null);
      setIsLoading(false);
    }
  }, [data, isUserLoading]);

  // Google login mutation
  const googleLoginMutation = useMutation({
    mutationFn: async (tokenResponse: { credential: string }) => {
      try {
        const response = await apiRequest("POST", "/api/auth/google", tokenResponse);
        return await response.json() as GoogleLoginResponse;
      } catch (error: any) {
        throw new Error(error.message || "Google login failed. Please try again.");
      }
    },
    onSuccess: (response: GoogleLoginResponse) => {
      setUser(response.user);
      queryClient.setQueryData(["/api/auth/user"], response.user);
      toast({
        title: "Login successful",
        description: "Welcome to your journal!",
      });
      trackEvent(Events.UI.GoogleLogin, { success: true });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Google login failed",
        description: error.message || "There was an issue with Google authentication",
        variant: "destructive",
      });
      trackEvent(Events.UI.GoogleLogin, { success: false, error: error.message });
    }
  });

  // Implement Google login using the react-oauth/google hook
  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      googleLoginMutation.mutate({ access_token: tokenResponse.access_token });
    },
    onError: (errorResponse) => {
      toast({
        title: "Google login failed",
        description: errorResponse.error_description || "Unable to authenticate with Google",
        variant: "destructive",
      });
      trackEvent(Events.UI.GoogleLogin, { success: false, error: errorResponse.error_description });
    },
  });
  
  // Wrapper function for the Google login
  const loginWithGoogle = () => {
    googleLogin();
  };

  // Traditional login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      try {
        const response = await apiRequest("POST", "/api/auth/login", credentials);
        // Ensure we return the JSON data, not the Response object
        return await response.json() as LoginResponse;
      } catch (error: any) {
        throw new Error(error.message || "Login failed. Please check your credentials.");
      }
    },
    onSuccess: (response: LoginResponse) => {
      setUser(response.user);
      queryClient.setQueryData(["/api/auth/user"], response.user);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      trackEvent(Events.UI.Login, { success: true });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
      trackEvent(Events.UI.Login, { success: false, error: error.message });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: { username: string; email: string; password: string; confirmPassword: string }) => {
      try {
        const response = await apiRequest("POST", "/api/auth/register", userData);
        // Ensure we return the JSON data, not the Response object
        return await response.json() as User;
      } catch (error: any) {
        throw new Error(error.message || "Registration failed. Please try again.");
      }
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "Your account has been created! Please log in.",
      });
      trackEvent(Events.UI.Register, { success: true });
      setLocation("/login");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "There was a problem with registration",
        variant: "destructive",
      });
      trackEvent(Events.UI.Register, { success: false, error: error.message });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await apiRequest("POST", "/api/auth/logout");
        // Ensure we return the JSON data, not the Response object
        return await response.json() as { message: string };
      } catch (error: any) {
        throw new Error(error.message || "Logout failed. Please try again.");
      }
    },
    onSuccess: () => {
      setUser(null);
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      trackEvent(Events.UI.Logout, { success: true });
      // Don't redirect after logout, stay on the current page
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message || "There was a problem logging out",
        variant: "destructive",
      });
      trackEvent(Events.UI.Logout, { success: false, error: error.message });
    },
  });

  // Auth methods
  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (username: string, email: string, password: string, confirmPassword: string) => {
    await registerMutation.mutateAsync({ username, email, password, confirmPassword });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    loginWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}