import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { Task } from "@shared/schema";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Target, Clock, List, CalendarCheck, BarChart3, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

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
  
  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tasks Progress Card */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-none transform hover:scale-[1.02]">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex justify-between items-center mb-3">
              <div className="bg-blue-400/30 p-1.5 rounded-lg flex items-center gap-2">
                <List className="h-5 w-5" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="rounded-full bg-blue-400/30 p-1 hover:bg-blue-400/50 transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-blue-900 text-white border-blue-700">
                    <p className="max-w-xs">Tracks the completion of all tasks from both Today's Tasks and Other Tasks sections.</p>
                  </TooltipContent>
                </Tooltip>
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
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-none transform hover:scale-[1.02]">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex justify-between items-center mb-3">
              <div className="bg-emerald-400/30 p-1.5 rounded-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="rounded-full bg-emerald-400/30 p-1 hover:bg-emerald-400/50 transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-emerald-900 text-white border-emerald-700">
                    <p className="max-w-xs">Tracks the achievement of goals from the Goals section.</p>
                  </TooltipContent>
                </Tooltip>
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
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-none transform hover:scale-[1.02]">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex justify-between items-center mb-3">
              <div className="bg-purple-400/30 p-1.5 rounded-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="rounded-full bg-purple-400/30 p-1 hover:bg-purple-400/50 transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-purple-900 text-white border-purple-700">
                    <p className="max-w-xs">Tracks "L" priority tasks (high-impact, low-effort) from both Today's Tasks and Other Tasks sections.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg font-bold">
                  {completedHighPriorityTasks}/{highPriorityTasks}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                High Priority <span className="text-xs bg-purple-400/30 rounded px-1 py-0.5">(L tasks)</span>
              </h3>
              <Progress value={highPriorityPercentage} className="h-1.5 bg-purple-400/30" />
              <p className="text-xs text-purple-100">{highPriorityPercentage}% complete</p>
            </div>
          </CardContent>
        </Card>

        {/* Overall Progress Card */}
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-none transform hover:scale-[1.02]">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex justify-between items-center mb-3">
              <div className="bg-amber-400/30 p-1.5 rounded-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="rounded-full bg-amber-400/30 p-1 hover:bg-amber-400/50 transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-amber-900 text-white border-amber-700">
                    <p className="max-w-xs">Combined daily progress showing the completion rate of all tasks and goals together.</p>
                  </TooltipContent>
                </Tooltip>
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
    </TooltipProvider>
  );
}