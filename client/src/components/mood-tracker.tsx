import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { EmojiPicker } from "./ui/emoji-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MoodEntry } from "@shared/schema";

const MOOD_LABELS: Record<string, string> = {
  "😊": "Happy",
  "🥳": "Excited",
  "😐": "Neutral",
  "😴": "Tired",
  "😤": "Frustrated",
  "😢": "Sad",
  "😌": "Peaceful"
};

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
        <CardTitle>Current Mood</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <EmojiPicker
          selected={currentMood}
          onSelect={(emoji) => createMood.mutate(emoji)}
        />
        {currentMood && (
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-800">
              {MOOD_LABELS[currentMood]}
            </h3>
          </div>
        )}
      </CardContent>
    </Card>
  );
}