import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { Task } from "@shared/schema";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Target, Clock, List, CalendarCheck, BarChart3 } from "lucide-react";

interface DailySummaryProps {
  todayTasks: Task[];
  otherTasks: Task[];
  goals: { id: number; content: string; completed: boolean }[];
}

export function DailySummary({ todayTasks, otherTasks, goals }: DailySummaryProps) {
  // Calculate completion statistics
  const totalTodayTasks = todayTasks.length;
  const completedTodayTasks = todayTasks.filter(task => task.completed).length;
  
  const totalTasksWithPriority = todayTasks.filter(task => task.priority > 0).length;
  const totalHighPriorityCompleted = todayTasks
    .filter(task => task.priority === 3 && task.completed).length;
  
  const totalGoals = goals.length;
  const completedGoals = goals.filter(goal => goal.completed).length;
  
  // Calculate percentages
  const taskCompletionPercentage = totalTodayTasks > 0 
    ? Math.round((completedTodayTasks / totalTodayTasks) * 100) 
    : 0;
  
  const goalCompletionPercentage = totalGoals > 0 
    ? Math.round((completedGoals / totalGoals) * 100) 
    : 0;
    
  const highPriorityPercentage = totalTasksWithPriority > 0
    ? Math.round((totalHighPriorityCompleted / totalTasksWithPriority) * 100)
    : 0;
  
  const totalCompletionPercentage = Math.round(
    (completedTodayTasks + completedGoals) / 
    Math.max(1, (totalTodayTasks + totalGoals)) * 100
  );
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Tasks Progress Card */}
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-none">
        <CardContent className="pt-6 pb-4 px-5">
          <div className="flex justify-between items-center mb-4">
            <div className="bg-blue-400/30 p-2 rounded-lg">
              <List className="h-6 w-6" />
            </div>
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xl font-bold">
                {completedTodayTasks}/{totalTodayTasks}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Tasks Completed</h3>
            <Progress value={taskCompletionPercentage} className="h-1.5 bg-blue-400/30" />
            <p className="text-xs text-blue-100 mt-1">{taskCompletionPercentage}% complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Goals Progress Card */}
      <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-none">
        <CardContent className="pt-6 pb-4 px-5">
          <div className="flex justify-between items-center mb-4">
            <div className="bg-emerald-400/30 p-2 rounded-lg">
              <Target className="h-6 w-6" />
            </div>
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xl font-bold">
                {completedGoals}/{totalGoals}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Goals Achieved</h3>
            <Progress value={goalCompletionPercentage} className="h-1.5 bg-emerald-400/30" />
            <p className="text-xs text-emerald-100 mt-1">{goalCompletionPercentage}% complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Priority Tasks Card */}
      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-none">
        <CardContent className="pt-6 pb-4 px-5">
          <div className="flex justify-between items-center mb-4">
            <div className="bg-purple-400/30 p-2 rounded-lg">
              <Clock className="h-6 w-6" />
            </div>
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xl font-bold">
                {totalHighPriorityCompleted}/{totalTasksWithPriority}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">High Priority</h3>
            <Progress value={highPriorityPercentage} className="h-1.5 bg-purple-400/30" />
            <p className="text-xs text-purple-100 mt-1">{highPriorityPercentage}% complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Overall Progress Card */}
      <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-none">
        <CardContent className="pt-6 pb-4 px-5">
          <div className="flex justify-between items-center mb-4">
            <div className="bg-amber-400/30 p-2 rounded-lg">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xl font-bold">
                {totalCompletionPercentage}%
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Overall Progress</h3>
            <Progress value={totalCompletionPercentage} className="h-1.5 bg-amber-400/30" />
            <p className="text-xs text-amber-100 mt-1">Daily completion rate</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}