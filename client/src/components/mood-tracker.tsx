import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { EmojiPicker } from "./ui/emoji-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import type { MoodEntry } from "@shared/schema";
import { trackEvent, Events } from "@/lib/amplitude";
import { useEffect } from "react";

const MOOD_LABELS: Record<string, { label: string, color: string }> = {
  "😊": { label: "Happy", color: "from-green-50 to-emerald-50" },
  "🥳": { label: "Excited", color: "from-purple-50 to-pink-50" },
  "😌": { label: "Peaceful", color: "from-yellow-50 to-amber-50" },
  "🤔": { label: "Thoughtful", color: "from-blue-50 to-cyan-50" },
  "😐": { label: "Neutral", color: "from-gray-50 to-slate-50" },
  "😴": { label: "Tired", color: "from-blue-50 to-indigo-50" },
  "😤": { label: "Frustrated", color: "from-red-50 to-orange-50" },
  "😢": { label: "Sad", color: "from-indigo-50 to-blue-50" },
  "😰": { label: "Anxious", color: "from-orange-50 to-red-50" },
  "🤗": { label: "Grateful", color: "from-teal-50 to-emerald-50" },
  "🤩": { label: "Inspired", color: "from-pink-50 to-rose-50" },
  "😌": { label: "Relaxed", color: "from-green-50 to-teal-50" },
  "🤪": { label: "Playful", color: "from-fuchsia-50 to-purple-50" },
  "🥱": { label: "Sleepy", color: "from-slate-50 to-zinc-50" },
  "😎": { label: "Confident", color: "from-amber-50 to-yellow-50" },
  "🤓": { label: "Focused", color: "from-cyan-50 to-sky-50" },
  "😇": { label: "Blessed", color: "from-violet-50 to-purple-50" },
  "😤": { label: "Determined", color: "from-rose-50 to-red-50" },
  "😮": { label: "Surprised", color: "from-lime-50 to-green-50" },
  "🥺": { label: "Overwhelmed", color: "from-red-50 to-pink-50" }
};

export function MoodTracker() {
  const queryClient = useQueryClient();

  // Track when the mood section is opened
  useEffect(() => {
    trackEvent(Events.MOOD_SECTION_OPEN, {
      componentName: 'MoodTracker',
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isWeekend: [0, 6].includes(new Date().getDay()),
      availableMoods: Object.keys(MOOD_LABELS).length
    });
  }, []);

  const { data: moodEntries } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood"],
  });

  const createMood = useMutation({
    mutationFn: async (mood: string) => {
      await apiRequest("POST", "/api/mood", { mood });
    },
    onSuccess: (_, mood) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });

      // Track mood selection with detailed properties
      trackEvent(Events.MOOD_SELECTED, {
        mood,
        moodLabel: MOOD_LABELS[mood].label,
        previousMood: moodEntries?.[0]?.mood || null,
        moodChangeTime: moodEntries?.[0] ? new Date().getTime() - new Date(moodEntries[0].timestamp).getTime() : null,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        isWeekend: [0, 6].includes(new Date().getDay()),
        moodHistory: moodEntries?.slice(0, 5).map(entry => entry.mood) || [],
        moodFrequency: moodEntries?.reduce((acc, entry) => {
          acc[entry.mood] = (acc[entry.mood] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
    },
  });

  const currentMood = moodEntries?.[0]?.mood;
  const moodInfo = currentMood ? MOOD_LABELS[currentMood] : undefined;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>How are you feeling?</CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div 
          className="flex flex-col gap-3"
          initial={false}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <AnimatePresence mode="wait">
              {moodInfo && (
                <motion.div
                  key={currentMood}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`flex-1 p-4 rounded-xl bg-gradient-to-r ${moodInfo.color} transform hover:scale-105 transition-transform min-h-[80px] flex items-center justify-center`}
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
              moods={Object.keys(MOOD_LABELS)}
            />
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}