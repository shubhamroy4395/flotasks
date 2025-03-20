import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Star, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

const PRIORITIES = [
  {
    label: "L",
    value: 3,
    color: "bg-gradient-to-r from-blue-100 to-emerald-50 text-blue-700",
    title: "Leverage (L)",
    subtitle: "High Impact, Low Effort 🚀",
    description: "These tasks deliver outsized results with minimal effort. Prioritize them first!"
  },
  {
    label: "N",
    value: 2,
    color: "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700",
    title: "Neutral (N)",
    subtitle: "Necessary but Balanced ⚖️",
    description: "These tasks are important but don't drastically change outcomes. Handle them after leverage tasks."
  },
  {
    label: "O",
    value: 1,
    color: "bg-gradient-to-r from-red-50 to-orange-50 text-red-700",
    title: "Overhead (O)",
    subtitle: "High Effort, Low Reward ⏳",
    description: "These tasks consume time without significant returns. Avoid or delegate if possible."
  }
];

export function GoalsSection() {
  const initialGoals = [
    { id: 1, content: "", completed: false, priority: 0, isEditing: false },
    { id: 2, content: "", completed: false, priority: 0, isEditing: false },
    { id: 3, content: "", completed: false, priority: 0, isEditing: false }
  ];

  const [goals, setGoals] = useState(initialGoals);

  // Reset goals state when component remounts (which happens on data clear)
  useEffect(() => {
    setGoals(initialGoals);
  }, []);

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

  const setPriority = (index: number, priority: number) => {
    setGoals(prev =>
      prev.map((goal, i) =>
        i === index ? { ...goal, priority } : goal
      )
    );
  };

  const setEditing = (index: number, isEditing: boolean) => {
    setGoals(prev =>
      prev.map((goal, i) =>
        i === index ? { ...goal, isEditing } : goal
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setEditing(index, false);
    }
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-gray-50 border-t-4 border-t-yellow-400">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-white bg-opacity-80">
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Top 3 Goals for Today
        </CardTitle>
      </CardHeader>
      <CardContent className="bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CiAgPHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPgogIDxwYXRoIGQ9Ik0zMCAzMG0tMSAwYTEgMSAwIDEgMCAyIDBhMSAxIDAgMSAwIC0yIDB6IiBmaWxsPSJyZ2JhKDIyOSwgMjMxLCAyMzUsIDAuNSkiLz4KPC9zdmc+')] bg-repeat">
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
              {goal.isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={goal.content}
                    onChange={(e) => updateGoal(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="flex-1 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none dark:text-white dark:placeholder-gray-400"
                    placeholder={`Goal ${index + 1}`}
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    {PRIORITIES.map(({ label, value, color }) => (
                      <Button
                        key={label}
                        size="sm"
                        variant="ghost"
                        className={`px-2 ${color} font-black transform transition-all duration-200 hover:scale-105 ${goal.priority === value ? 'ring-2 ring-offset-2' : ''}`}
                        onClick={() => setPriority(index, value)}
                      >
                        {label}
                      </Button>
                    ))}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-gray-700"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          {PRIORITIES.map(({ label, title, subtitle, description, color }) => (
                            <div key={label} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-md text-xs font-black ${color}`}>
                                  {label}
                                </span>
                                <h4 className="font-bold">{title}</h4>
                              </div>
                              <p className="text-sm font-medium">{subtitle}</p>
                              <p className="text-xs text-gray-600">{description}</p>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              ) : (
                <div
                  className={`flex items-center justify-between w-full cursor-text ${
                    goal.completed ? 'line-through text-gray-400' : 'text-gray-700 font-bold'
                  }`}
                  onClick={() => setEditing(index, true)}
                >
                  <span>{goal.content || " "}</span>
                  {goal.content && goal.priority > 0 && (
                    <span className={`px-2 py-0.5 rounded-md text-xs font-black ${
                      PRIORITIES.find(p => p.value === goal.priority)?.color
                    }`}>
                      {PRIORITIES.find(p => p.value === goal.priority)?.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}