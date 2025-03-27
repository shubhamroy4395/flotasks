import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { Task } from "@shared/schema";
import { motion } from "framer-motion";
import { List, Target, Clock, BarChart3, Info, ArrowLeft } from "lucide-react";

interface DailySummaryProps {
  todayTasks: Task[];
  otherTasks: Task[];
  goals: { id: number; content: string; completed: boolean }[];
}

// Define props for each progress card
interface ProgressCardProps {
  title: string;
  subtitle?: string;
  percentage: number;
  count: { completed: number; total: number };
  icon: React.ReactNode;
  color: {
    from: string;
    to: string;
    bgAccent: string;
    textAccent: string;
    infoBg: string;
  };
  description: string;
}

// Progress card component with info toggle
function ProgressCard({ 
  title, 
  subtitle, 
  percentage, 
  count, 
  icon, 
  color, 
  description 
}: ProgressCardProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div>
      {!showInfo ? (
        // Front side - Progress view
        <Card className={`bg-gradient-to-br ${color.from} ${color.to} text-white overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-none h-full`}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex justify-between items-center mb-3">
              <div className={`${color.bgAccent} p-1.5 rounded-lg flex items-center gap-2`}>
                {icon}
                <button 
                  onClick={() => setShowInfo(true)}
                  className={`rounded-full ${color.bgAccent} p-1 hover:bg-opacity-50 transition-colors`}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg font-bold">
                  {count.completed}/{count.total}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                {title}
                {subtitle && (
                  <span className={`text-xs ${color.bgAccent} rounded px-1 py-0.5`}>
                    {subtitle}
                  </span>
                )}
              </h3>
              <Progress value={percentage} className={`h-1.5 ${color.bgAccent}`} />
              <p className={`text-xs ${color.textAccent}`}>{percentage}% complete</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Back side - Info view
        <Card className={`bg-gradient-to-br ${color.from} ${color.to} text-white overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-none h-full flex flex-col`}>
          <CardContent className="pt-4 pb-3 px-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">About This Card</h3>
              <button 
                onClick={() => setShowInfo(false)}
                className={`${color.bgAccent} p-1.5 rounded-full hover:bg-opacity-50 transition-colors`}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className={`${color.infoBg} p-3 rounded-lg mb-2`}>
                <p className="text-sm">{description}</p>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <p className="text-sm font-medium text-white/90">Current progress:</p>
                <p className="font-bold text-lg mt-1">
                  {count.completed} of {count.total} {count.total === 1 ? 'item' : 'items'} ({percentage}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function DailySummary({ todayTasks, otherTasks, goals }: DailySummaryProps) {
  // Filter tasks to only include those with actual content
  const validTodayTasks = todayTasks.filter(task => Boolean(task.content));
  const validOtherTasks = otherTasks.filter(task => Boolean(task.content));
  
  // Tasks calculations
  const totalTasks = validTodayTasks.length + validOtherTasks.length;
  const completedTasks = validTodayTasks.filter(t => t.completed).length + 
                         validOtherTasks.filter(t => t.completed).length;
  
  // Goals calculations
  const totalGoals = goals.length;
  const completedGoals = goals.filter(goal => goal.completed).length;
  
  // High priority task calculations (priority 3 is the highest) from both Today and Other tasks
  const highPriorityTasks = 
    validTodayTasks.filter(task => task.priority === 3).length + 
    validOtherTasks.filter(task => task.priority === 3).length;
    
  const completedHighPriorityTasks = 
    validTodayTasks.filter(task => task.priority === 3 && task.completed).length +
    validOtherTasks.filter(task => task.priority === 3 && task.completed).length;
  
  // Calculate percentages with safeguards against division by zero
  const taskCompletionPercentage = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;
  
  const goalCompletionPercentage = totalGoals > 0 
    ? Math.round((completedGoals / totalGoals) * 100) 
    : 0;
    
  const highPriorityPercentage = highPriorityTasks > 0
    ? Math.round((completedHighPriorityTasks / highPriorityTasks) * 100)
    : 0;
  
  // Overall progress includes both tasks and goals
  const totalItems = totalTasks + totalGoals;
  const completedItems = completedTasks + completedGoals;
  const totalCompletionPercentage = totalItems > 0
    ? Math.round((completedItems / totalItems) * 100)
    : 0;
  
  // Define card data for each progress card
  const cards: ProgressCardProps[] = [
    {
      title: "Tasks Completed",
      percentage: taskCompletionPercentage,
      count: { completed: completedTasks, total: totalTasks },
      icon: <List className="h-5 w-5" />,
      color: {
        from: "from-blue-500",
        to: "to-blue-600",
        bgAccent: "bg-blue-400/30",
        textAccent: "text-blue-100",
        infoBg: "bg-blue-600/40",
      },
      description: "This card tracks all your tasks from both Today's Tasks and Other Tasks sections. It shows how many tasks you've completed out of your total tasks."
    },
    {
      title: "Goals Achieved",
      percentage: goalCompletionPercentage,
      count: { completed: completedGoals, total: totalGoals },
      icon: <Target className="h-5 w-5" />,
      color: {
        from: "from-emerald-500",
        to: "to-emerald-600",
        bgAccent: "bg-emerald-400/30",
        textAccent: "text-emerald-100",
        infoBg: "bg-emerald-600/40",
      },
      description: "This card tracks your personal goals from the Goals section. It shows your progress toward accomplishing your set objectives."
    },
    {
      title: "High Priority",
      subtitle: "(L tasks)",
      percentage: highPriorityPercentage,
      count: { completed: completedHighPriorityTasks, total: highPriorityTasks },
      icon: <Clock className="h-5 w-5" />,
      color: {
        from: "from-purple-500",
        to: "to-purple-600",
        bgAccent: "bg-purple-400/30",
        textAccent: "text-purple-100",
        infoBg: "bg-purple-600/40",
      },
      description: "This card specifically tracks 'L' priority tasks (high-impact, low-effort) from both Today's Tasks and Other Tasks sections. These are your most valuable tasks that give maximum results for minimal effort."
    },
    {
      title: "Overall Progress",
      percentage: totalCompletionPercentage,
      count: { completed: completedItems, total: totalItems },
      icon: <BarChart3 className="h-5 w-5" />,
      color: {
        from: "from-amber-500",
        to: "to-amber-600",
        bgAccent: "bg-amber-400/30",
        textAccent: "text-amber-100",
        infoBg: "bg-amber-600/40",
      },
      description: "This card shows your combined progress across all activities. It aggregates your tasks and goals to give you an overall completion percentage for the day."
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => (
        <ProgressCard key={index} {...card} />
      ))}
    </div>
  );
}