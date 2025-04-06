import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiLinkedin } from "react-icons/si";
import { Info, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export function InfoDialog() {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  
  // Handle close button click only, prevent outside clicks from closing
  const handleOpenChange = (open: boolean) => {
    // Only allow explicit button clicks to open/close
    if (open) {
      setOpen(true);
    }
    // Don't allow automatic closing from outside clicks
  };

  // This function will be called when the user deliberately clicks the close button
  const handleClose = () => {
    setOpen(false);
  };
  
  const getReleaseNotes = () => {
    return [
      {
        version: "1.3.0",
        date: "March, 2025",
        changes: [
          "Added theme toggle with 5 themes (Default, Dark, Spring, Winter, Retro Windows 98)",
          "Added performance optimizations for all components",
          "Fixed progress bar colors to match card themes",
          "Enhanced Windows 98 styling for authentic retro experience",
          "Added developer info & release notes"
        ]
      },
      {
        version: "1.2.0",
        date: "February, 2025",
        changes: [
          "Added mood tracking with emoji support",
          "Added goal setting and tracking feature",
          "Added productivity insights dashboard",
          "Improved task categorization",
          "Added gratitude journal feature"
        ]
      },
      {
        version: "1.1.0",
        date: "January, 2025",
        changes: [
          "Added task prioritization",
          "Added estimated time tracking",
          "Improved UI with card-based layout",
          "Added dark mode support",
          "Added persistent storage via database"
        ]
      },
      {
        version: "1.0.0",
        date: "December, 2024",
        changes: [
          "Initial release",
          "Basic task management",
          "Simple note-taking feature",
          "Daily task view",
          "Task completion tracking"
        ]
      }
    ];
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className={theme === 'retro' ? 'ml-1 w-8 h-8 p-0' : 'ml-1'}>
          <Info className={theme === 'retro' ? 'w-4 h-4' : 'w-5 h-5'} />
        </Button>
      </DialogTrigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">About Flo Tasks</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="about">
            <TabsList className="w-full">
              <TabsTrigger value="about" className="flex-1">About</TabsTrigger>
              <TabsTrigger value="releases" className="flex-1">Release Notes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="about" className="mt-4">
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold">Shubham Roy</h3>
                  <p className="text-sm text-muted-foreground">Product Manager & Developer</p>
                </div>
                
                <p className="text-sm">
                  I am Shubham Roy. I have 4 years of experience across software development 
                  and product management. I have worked as a Product Manager for Microsoft Bing 
                  for their shopping answer. Previously I worked as a Java developer creating 
                  REST APIs and batch microservices, and as a Product Analyst for a promotion platform.
                </p>
                
                <p className="text-sm">
                  I love building things and I love product management. If you want to reach me 
                  click on my LinkedIn below. Thanks
                </p>
                
                <div className="pt-2 flex justify-center">
                  <a 
                    href="https://www.linkedin.com/in/roy-shubham/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#0A66C2] text-white hover:bg-[#004182] transition-colors"
                  >
                    <SiLinkedin />
                    <span>Connect on LinkedIn</span>
                  </a>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="releases" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {getReleaseNotes().map((release) => (
                    <div key={release.version} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold">Version {release.version}</h3>
                        <span className="text-xs text-muted-foreground">{release.date}</span>
                      </div>
                      <ul className="space-y-1">
                        {release.changes.map((change, idx) => (
                          <li key={idx} className="text-sm flex items-start">
                            <span className="mr-2">•</span>
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          
          <div className="mt-4 pt-2 border-t flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
            >
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </div>
        </DialogContent>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}