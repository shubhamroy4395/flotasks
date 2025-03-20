import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { EmojiPicker } from "./ui/emoji-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MoodEntry } from "@shared/schema";

export function MoodTracker() {
  const queryClient = useQueryClient();
  
  const { data: moodEntries } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood"],
  });

  const createMood = useMutation({
    mutationFn: async (mood: string) => {
      await apiRequest("POST", "/api/mood", { mood });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });
    },
  });

  const currentMood = moodEntries?.[0]?.mood;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mood</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center">
        <EmojiPicker
          selected={currentMood}
          onSelect={(emoji) => createMood.mutate(emoji)}
        />
      </CardContent>
    </Card>
  );
}
