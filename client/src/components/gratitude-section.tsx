import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GratitudeEntry } from "@shared/schema";
import { trackEvent, Events } from "@/lib/amplitude";

export function GratitudeSection() {
  const [newEntry, setNewEntry] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    trackEvent(Events.GRATITUDE_SECTION_OPEN, {
      componentName: 'GratitudeSection',
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isWeekend: [0, 6].includes(new Date().getDay())
    });
  }, []);

  const { data: entries } = useQuery<GratitudeEntry[]>({
    queryKey: ["/api/gratitude"],
  });

  const createEntry = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/gratitude", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] });
      setNewEntry("");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gratitude Journal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="I am grateful for..."
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newEntry.trim()) {
              createEntry.mutate(newEntry);
            }
          }}
          onBlur={() => {
            if (newEntry.trim()) {
              createEntry.mutate(newEntry);
            }
          }}
          className="border-none shadow-none bg-transparent focus:ring-0"
        />
        <div className="space-y-2">
          {entries?.map((entry) => (
            <div key={entry.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {entry.content}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}