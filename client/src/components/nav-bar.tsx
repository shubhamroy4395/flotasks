import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent, Events } from "@/lib/amplitude";

export function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Animation variants
  const dropdownVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      scale: 0.95,
      transition: { duration: 0.15, ease: "easeIn" }
    }
  };

  return (
    <div className="flex-shrink-0">
      <div className="flex items-center justify-end px-4 py-2">
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full overflow-hidden hover:bg-black/5 transition-colors">
                <Avatar>
                  {user?.picture ? (
                    <AvatarImage src={user.picture} alt={user.username} />
                  ) : (
                    <AvatarFallback>{user?.username ? getInitials(user.username) : "U"}</AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" asChild>
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={dropdownVariants}
              >
                <div className="p-2">
                  <p className="text-sm font-medium">{user?.username || user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => logout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </motion.div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center space-x-2">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                trackEvent(Events.UI.GoogleLogin, {
                  success: true,
                  timestamp: new Date().toISOString()
                });

                // Make API request to our backend
                apiRequest("POST", "/api/auth/google", {
                  credential: credentialResponse.credential
                })
                  .then(() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                    toast({
                      title: "Successfully signed in",
                      description: "Welcome back!",
                      duration: 3000
                    });
                  })
                  .catch(error => {
                    console.error("Google login error:", error);
                    toast({
                      title: "Sign in failed",
                      description: "Could not sign in with Google. Please try again.",
                      variant: "destructive",
                      duration: 5000
                    });
                  });
              }}
              onError={() => {
                trackEvent(Events.UI.AuthError, {
                  type: 'google_oauth_error',
                  timestamp: new Date().toISOString()
                });
                
                toast({
                  title: "Sign in failed",
                  description: "Could not sign in with Google. Please try again.",
                  variant: "destructive",
                  duration: 5000
                });
              }}
              logo_alignment="center"
              shape="pill"
              type="standard"
              theme="outline"
              size="large"
              text="signin_with"
              locale="en"
            />
          </div>
        )}
      </div>
    </div>
  );
}