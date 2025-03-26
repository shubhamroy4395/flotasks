import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { Task } from "@shared/schema";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Timer, Target, CalendarCheck } from "lucide-react";

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
  
  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-indigo-50 to-purple-50 border-t-4 border-t-indigo-400 transform-gpu">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 bg-white bg-opacity-60">
        <div>
          <CardTitle className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            Daily Progress
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear" }}
            >
              <Sparkles className="h-5 w-5 text-yellow-400" />
            </motion.div>
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Your productivity overview for today
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* Tasks Completion */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-gray-700">Task Completion</h3>
            </div>
            <span className="text-2xl font-black text-blue-700">{completedTodayTasks}/{totalTodayTasks}</span>
          </div>
          <Progress value={taskCompletionPercentage} className="h-2 bg-blue-100" />
          <p className="text-sm text-gray-600 italic">
            {taskCompletionPercentage}% of today's tasks completed
          </p>
        </div>
        
        {/* Goal Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-gray-700">Goal Progress</h3>
            </div>
            <span className="text-2xl font-black text-emerald-700">{completedGoals}/{totalGoals}</span>
          </div>
          <Progress value={goalCompletionPercentage} className="h-2 bg-emerald-100" />
          <p className="text-sm text-gray-600 italic">
            {goalCompletionPercentage}% of your goals achieved
          </p>
        </div>
        
        {/* High Priority Tasks */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-gray-700">High Priority Completion</h3>
            </div>
            <span className="text-2xl font-black text-purple-700">{totalHighPriorityCompleted}/{totalTasksWithPriority}</span>
          </div>
          <Progress value={highPriorityPercentage} className="h-2 bg-purple-100" />
          <p className="text-sm text-gray-600 italic">
            {highPriorityPercentage}% of leverage (L) tasks completed
          </p>
        </div>
        
        {/* Summary Message */}
        <div className="mt-4 p-4 rounded-lg bg-white bg-opacity-60 border border-indigo-100">
          <h4 className="font-bold text-gray-800 mb-2">Today's Achievements</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {completedTodayTasks > 0 && (
              <li>Completed {completedTodayTasks} tasks</li>
            )}
            {completedGoals > 0 && (
              <li>Achieved {completedGoals} goals</li>
            )}
            {totalHighPriorityCompleted > 0 && (
              <li>Finished {totalHighPriorityCompleted} high-leverage tasks</li>
            )}
            {completedTodayTasks === 0 && completedGoals === 0 && (
              <li>Start your day by completing some tasks and goals!</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}