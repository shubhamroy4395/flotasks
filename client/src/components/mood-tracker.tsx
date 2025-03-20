import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { EmojiPicker } from "./ui/emoji-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import type { MoodEntry } from "@shared/schema";

const MOOD_LABELS: Record<string, { label: string, color: string }> = {
  "😊": { label: "Happy", color: "from-green-50 to-emerald-50" },
  "🥳": { label: "Excited", color: "from-purple-50 to-pink-50" },
  "😐": { label: "Neutral", color: "from-gray-50 to-slate-50" },
  "😴": { label: "Tired", color: "from-blue-50 to-indigo-50" },
  "😤": { label: "Frustrated", color: "from-red-50 to-orange-50" },
  "😢": { label: "Sad", color: "from-indigo-50 to-blue-50" },
  "😌": { label: "Peaceful", color: "from-yellow-50 to-amber-50" }
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
  const moodInfo = currentMood ? MOOD_LABELS[currentMood] : undefined;

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">How are you feeling?</CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div 
          className="flex flex-col items-center gap-3"
          initial={false}
        >
          <AnimatePresence mode="wait">
            {moodInfo && (
              <motion.div
                key={currentMood}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`w-full p-4 rounded-xl bg-gradient-to-r ${moodInfo.color} transform hover:scale-105 transition-transform`}
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl">{currentMood}</span>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {moodInfo.label}
                  </h3>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <EmojiPicker
            selected={currentMood}
            onSelect={(emoji) => createMood.mutate(emoji)}
          />
        </motion.div>
      </CardContent>
    </Card>
  );
}