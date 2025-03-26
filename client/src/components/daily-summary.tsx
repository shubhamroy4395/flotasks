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
  
  // High priority task calculations (priority 3 is the highest)
  const highPriorityTasks = validTodayTasks.filter(task => task.priority === 3).length;
  const completedHighPriorityTasks = validTodayTasks
    .filter(task => task.priority === 3 && task.completed).length;
  
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
  
  return (
    <div className="flex overflow-x-auto pb-2 gap-3 hide-scrollbar">
      {/* Tasks Progress Card */}
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border-none transform hover:scale-[1.02] min-w-[250px] flex-shrink-0">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex justify-between items-center mb-3">
            <div className="bg-blue-400/30 p-1.5 rounded-lg">
              <List className="h-5 w-5" />
            </div>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg font-bold">
                {completedTasks}/{totalTasks}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Tasks Completed</h3>
            <Progress value={taskCompletionPercentage} className="h-1.5 bg-blue-400/30" />
            <p className="text-xs text-blue-100">{taskCompletionPercentage}% complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Goals Progress Card */}
      <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border-none transform hover:scale-[1.02] min-w-[250px] flex-shrink-0">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex justify-between items-center mb-3">
            <div className="bg-emerald-400/30 p-1.5 rounded-lg">
              <Target className="h-5 w-5" />
            </div>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg font-bold">
                {completedGoals}/{totalGoals}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Goals Achieved</h3>
            <Progress value={goalCompletionPercentage} className="h-1.5 bg-emerald-400/30" />
            <p className="text-xs text-emerald-100">{goalCompletionPercentage}% complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Priority Tasks Card */}
      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border-none transform hover:scale-[1.02] min-w-[250px] flex-shrink-0">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex justify-between items-center mb-3">
            <div className="bg-purple-400/30 p-1.5 rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg font-bold">
                {completedHighPriorityTasks}/{highPriorityTasks}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">High Priority</h3>
            <Progress value={highPriorityPercentage} className="h-1.5 bg-purple-400/30" />
            <p className="text-xs text-purple-100">{highPriorityPercentage}% complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Overall Progress Card */}
      <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border-none transform hover:scale-[1.02] min-w-[250px] flex-shrink-0">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex justify-between items-center mb-3">
            <div className="bg-amber-400/30 p-1.5 rounded-lg">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg font-bold">
                {totalCompletionPercentage}%
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Overall Progress</h3>
            <Progress value={totalCompletionPercentage} className="h-1.5 bg-amber-400/30" />
            <p className="text-xs text-amber-100">Daily completion rate</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}