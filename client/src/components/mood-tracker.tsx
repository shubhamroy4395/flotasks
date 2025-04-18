import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { EmojiPicker } from "./ui/emoji-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import type { MoodEntry } from "@shared/schema";
import { trackEvent, Events } from "@/lib/amplitude";
import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const MOOD_LABELS: Record<string, { label: string, color: string, darkColor: string }> = {
  "😊": { 
    label: "Happy", 
    color: "from-green-50 to-emerald-50", 
    darkColor: "from-green-900/30 to-emerald-900/30" 
  },
  "🥳": { 
    label: "Excited", 
    color: "from-purple-50 to-pink-50", 
    darkColor: "from-purple-900/30 to-pink-900/30" 
  },
  "😌": { 
    label: "Peaceful", 
    color: "from-yellow-50 to-amber-50", 
    darkColor: "from-yellow-900/30 to-amber-900/30" 
  },
  "🤔": { 
    label: "Thoughtful", 
    color: "from-blue-50 to-cyan-50", 
    darkColor: "from-blue-900/30 to-cyan-900/30" 
  },
  "😐": { 
    label: "Neutral", 
    color: "from-gray-50 to-slate-50", 
    darkColor: "from-gray-800/40 to-slate-800/40" 
  },
  "😴": { 
    label: "Tired", 
    color: "from-blue-50 to-indigo-50", 
    darkColor: "from-blue-900/30 to-indigo-900/30" 
  },
  "😤": { 
    label: "Frustrated", 
    color: "from-red-50 to-orange-50", 
    darkColor: "from-red-900/30 to-orange-900/30" 
  },
  "😢": { 
    label: "Sad", 
    color: "from-indigo-50 to-blue-50", 
    darkColor: "from-indigo-900/30 to-blue-900/30" 
  },
  "😰": { 
    label: "Anxious", 
    color: "from-orange-50 to-red-50", 
    darkColor: "from-orange-900/30 to-red-900/30" 
  },
  "🤗": { 
    label: "Grateful", 
    color: "from-teal-50 to-emerald-50", 
    darkColor: "from-teal-900/30 to-emerald-900/30" 
  }
};

export function MoodTracker() {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark' || theme === 'winter';

  // Track when the mood section is opened
  useEffect(() => {
    trackEvent(Events.Mood.SectionOpen, {
      componentName: 'MoodTracker',
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isWeekend: [0, 6].includes(new Date().getDay()),
      availableMoods: Object.keys(MOOD_LABELS).length
    });
  }, []);

  // Get mood entries
  const { data: moodEntries = [] } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood"],
  });

  const createMood = useMutation({
    mutationFn: async (mood: string) => {
      await apiRequest("POST", "/api/mood", { mood });
    },
    onSuccess: (_, mood) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });

      // Track mood selection with detailed properties
      trackEvent(Events.Mood.Selected, {
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
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
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
                  className={`flex-1 p-4 rounded-xl bg-gradient-to-r ${isDarkTheme ? moodInfo.darkColor : moodInfo.color} transform hover:scale-105 transition-transform min-h-[80px] flex items-center justify-center`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-4xl">{currentMood}</span>
                    <h3 className={`text-lg font-semibold ${isDarkTheme ? 'text-gray-100' : 'text-gray-800'}`}>
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