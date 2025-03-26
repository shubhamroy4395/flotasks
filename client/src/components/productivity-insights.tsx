import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import type { MoodEntry, Task } from "@shared/schema";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ProductivityInsightsProps {
  moodEntries: MoodEntry[];
  todayTasks: Task[];
  otherTasks: Task[];
}

// Define chart data type
interface ChartDataItem {
  name: string;
  tasks: number;
  color: string;
}

// Define insight data types
interface ScoreInsight {
  type: "score";
  label: string;
  value: number;
  color: string;
}

interface ChartInsight {
  type: "chart";
  label: string;
  data: ChartDataItem[];
}

interface TextInsight {
  type: "text";
  label: string;
  text: string;
  color: string;
}

type InsightData = ScoreInsight | ChartInsight | TextInsight;

const MOOD_PRODUCTIVITY_MAP: Record<string, number> = {
  "😊": 85, // Happy - high productivity
  "🥳": 80, // Excited - high productivity but slightly distractible
  "😌": 75, // Peaceful - good focus
  "🤗": 70, // Grateful - positive mindset
  "🤔": 65, // Thoughtful - moderate productivity
  "😐": 50, // Neutral - average productivity
  "😴": 30, // Tired - low productivity
  "😰": 40, // Anxious - distracted productivity
  "😤": 45, // Frustrated - struggling focus
  "😢": 35, // Sad - low productivity
};

// Mood category mapping for insights
const MOOD_CATEGORIES: Record<string, "positive" | "neutral" | "negative"> = {
  "😊": "positive",
  "🥳": "positive",
  "😌": "positive",
  "🤗": "positive",
  "🤔": "neutral",
  "😐": "neutral",
  "😴": "negative",
  "😰": "negative",
  "😤": "negative",
  "😢": "negative",
};

export function ProductivityInsights({ moodEntries, todayTasks, otherTasks }: ProductivityInsightsProps) {
  const [expanded, setExpanded] = useState(false);
  const [insightData, setInsightData] = useState<InsightData[]>([]);

  useEffect(() => {
    if (moodEntries.length === 0) return;
    
    // Generate productivity insights
    generateInsights();
  }, [moodEntries, todayTasks, otherTasks]);

  const generateInsights = () => {
    const allTasks = [...todayTasks, ...otherTasks];
    const completedTasks = allTasks.filter(task => task.completed);
    const currentMood = moodEntries[0]?.mood;
    
    // Skip if no mood entries exist
    if (!currentMood) {
      setInsightData([]);
      return;
    }

    // Calculate current productivity score based on mood
    const productivityScore = MOOD_PRODUCTIVITY_MAP[currentMood] || 50;
    
    // Group task completion by mood categories
    const tasksByMoodCategory = {
      positive: 0,
      neutral: 0,
      negative: 0
    };
    
    // Count completed tasks for recent moods
    moodEntries.forEach(entry => {
      const mood = entry.mood;
      const category = MOOD_CATEGORIES[mood] || "neutral";
      const tasksForMood = completedTasks.filter(task => {
        const taskDate = new Date(task.timestamp || 0);
        const moodDate = new Date(entry.timestamp);
        
        // Count tasks completed within 3 hours of this mood
        return Math.abs(taskDate.getTime() - moodDate.getTime()) < 3 * 60 * 60 * 1000;
      });
      
      tasksByMoodCategory[category] += tasksForMood.length;
    });
    
    // Prepare chart data
    const chartData: ChartDataItem[] = [
      {
        name: "Positive Moods",
        tasks: tasksByMoodCategory.positive,
        color: "#10b981" // Green
      },
      {
        name: "Neutral Moods",
        tasks: tasksByMoodCategory.neutral,
        color: "#6b7280" // Gray
      },
      {
        name: "Challenging Moods",
        tasks: tasksByMoodCategory.negative,
        color: "#f59e0b" // Amber
      }
    ];
    
    // Productivity insights data
    const insights: InsightData[] = [
      {
        type: "score",
        label: "Current Productivity Score",
        value: productivityScore,
        color: getColorForScore(productivityScore)
      },
      {
        type: "chart",
        label: "Task Completion by Mood",
        data: chartData
      },
      {
        type: "text",
        label: "Mood Insight",
        text: generateMoodInsightText(currentMood, tasksByMoodCategory),
        color: MOOD_CATEGORIES[currentMood] === "positive" ? "text-green-600" : 
               MOOD_CATEGORIES[currentMood] === "neutral" ? "text-gray-600" : "text-amber-600"
      }
    ];
    
    setInsightData(insights);
  };
  
  const generateMoodInsightText = (mood: string, tasksByMoodCategory: Record<string, number>) => {
    const category = MOOD_CATEGORIES[mood] || "neutral";
    const totalTasks = tasksByMoodCategory.positive + tasksByMoodCategory.neutral + tasksByMoodCategory.negative;
    
    if (category === "positive") {
      if (tasksByMoodCategory.positive > tasksByMoodCategory.neutral && tasksByMoodCategory.positive > tasksByMoodCategory.negative) {
        return "You complete more tasks when in a positive mood. Try to maintain this state for optimal productivity.";
      } else {
        return "You're in a positive mood right now! This is typically when you're most productive.";
      }
    } else if (category === "neutral") {
      return "Your neutral mood is a balanced state. Consider short breaks or mood-boosting activities to increase productivity.";
    } else {
      if (tasksByMoodCategory.negative > tasksByMoodCategory.positive) {
        return "Interestingly, you often complete tasks even in challenging moods. This shows your resilience.";
      } else {
        return "Consider a short break or mood-lifting activity to improve your current state and productivity.";
      }
    }
  };
  
  const getColorForScore = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 50) return "bg-blue-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  if (insightData.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 mt-3">
        <CardHeader className="border-b">
          <CardTitle className="flex justify-between items-center">
            <span>Productivity Insights</span>
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {expanded ? "Show Less" : "Show More"}
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <div className="space-y-4">
            {insightData.map((insight, index) => (
              <div key={index} className={index > 0 && !expanded ? "hidden" : ""}>
                {insight.type === "score" && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{insight.label}</span>
                      <span className="text-sm font-bold">{insight.value}%</span>
                    </div>
                    <Progress value={insight.value} className={insight.color} />
                  </div>
                )}
                
                {insight.type === "chart" && expanded && (
                  <div>
                    <div className="text-sm font-medium mb-2">{insight.label}</div>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={insight.data}
                          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                        >
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => value.split(' ')[0]}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            label={{ value: 'Tasks', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                          />
                          <Tooltip />
                          <Bar dataKey="tasks">
                            {insight.data.map((entry: ChartDataItem, idx: number) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {insight.type === "text" && (
                  <div>
                    <div className={`text-sm ${insight.color} font-medium mt-2 italic`}>
                      {insight.text}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}