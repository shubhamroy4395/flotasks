import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Star } from "lucide-react";

interface GoalsSectionProps {
  onGoalsChange?: (goals: Array<{ id: number; content: string; completed: boolean }>) => void;
}

export function GoalsSection({ onGoalsChange }: GoalsSectionProps) {
  const [goals, setGoals] = useState<Array<{ id: number; content: string; completed: boolean }>>([
    { id: 1, content: "", completed: false },
    { id: 2, content: "", completed: false },
    { id: 3, content: "", completed: false }
  ]);
  
  useEffect(() => {
    if (onGoalsChange) {
      onGoalsChange(goals);
    }
  }, [goals, onGoalsChange]);

  const toggleGoal = (index: number) => {
    setGoals(prev => 
      prev.map((goal, i) => 
        i === index ? { ...goal, completed: !goal.completed } : goal
      )
    );
  };

  const updateGoal = (index: number, content: string) => {
    setGoals(prev => 
      prev.map((goal, i) => 
        i === index ? { ...goal, content } : goal
      )
    );
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Top 3 Goals for Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {goals.map((goal, index) => (
            <div key={goal.id} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 dark:text-gray-500 w-4 font-mono">
                {index + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${goal.completed ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800'}`}
                onClick={() => toggleGoal(index)}
              >
                {goal.completed && "✓"}
              </Button>
              <Input
                value={goal.content}
                onChange={(e) => updateGoal(index, e.target.value)}
                className="flex-1 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none dark:text-white dark:placeholder-gray-400"
                placeholder={`Goal ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}