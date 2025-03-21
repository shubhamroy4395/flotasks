# Analytics Implementation Documentation

## Event Categories and Properties

### Task Events

#### Today's Tasks
1. **TaskToday.View**
   - Properties for filtering:
      - taskCount: number of tasks
      - completedCount: number of completed tasks
      - averagePriority: average priority value
      - timeOfDay: hour of day (0-23)

2. **TaskToday.Created**
   - Top-level filterable properties:
      - category: "today" (use this to differentiate from other tasks)
      - priority_level: "L", "N", or "O" (use this for priority filtering)
      - priority_value: 3, 2, or 1 (numeric values for priority)
      - has_time: boolean
      - estimated_minutes: number
   - Task properties:
      - id: task identifier
      - content: task text
      - time: estimated time
      - position: task order
      - word_count: number of words
      - length: content length
   - Context properties:
      - total_tasks: total tasks in list
      - completed_tasks: completed tasks count
      - priority_distribution: count by priority level (L/N/O)

3. **TaskToday.Completed**
   - Top-level filterable properties:
      - category: "today"
      - priority_level: "L", "N", or "O"
      - priority_value: 3, 2, or 1
      - has_time: boolean
      - estimated_minutes: number
      - completion_time: timestamp
   - Task properties:
      - id: task identifier
      - content: task text
      - position: task position
      - age_ms: time since creation
   - Context properties:
      - total_tasks: number
      - completed_tasks: number
      - completion_rate: percentage

#### Other Tasks
1. **TaskOther.Created**
   - Identical properties to TaskToday.Created
   - category: "other" for filtering

2. **TaskOther.Completed**
   - Identical properties to TaskToday.Completed
   - category: "other" for filtering

### Implementation Status

#### Currently Working:
- Task Creation Events (Today & Other) with priority filtering
- Task Completion Events with timing metrics
- Basic event properties for all components

#### Known Issues:
- Other Tasks events not showing up properly in Amplitude
- Priority filtering not working consistently
- Some context properties might be missing in events

## How to Filter Tasks in Amplitude

### By Priority:
1. Use the `priority_level` property which contains:
   - "L" for Leverage (High Impact, Low Effort)
   - "N" for Neutral (Balanced)
   - "O" for Overhead (High Effort, Low Impact)

### By Category:
1. Use the `category` property:
   - "today" for Today's Tasks
   - "other" for Other Tasks

### By Time Estimation:
1. Use `has_time` (boolean) to filter tasks with/without time estimates
2. Use `estimated_minutes` (number) for specific time ranges

## Next Steps

### 1. Fix Current Issues
- [ ] Debug Other Tasks events not appearing in Amplitude
- [ ] Ensure priority filtering works consistently
- [ ] Add missing context properties to events

### 2. Add Task Analytics
- [ ] Track task edits (priority/time changes)
- [ ] Track task deletions
- [ ] Track task reordering events
- [ ] Track time between task creation and completion

### 3. Enhance Filtering Capabilities
- [ ] Add task category tagging
- [ ] Add time-of-day filtering
- [ ] Add completion rate filtering
- [ ] Add task age filtering

### 4. Performance Metrics
- [ ] Add load time tracking
- [ ] Track render performance
- [ ] Track API response times

### 5. User Journey
- [ ] Implement funnel analysis for task completion flow
- [ ] Track common patterns in task creation and management
- [ ] Track user session duration and frequency

## Common Properties (Added to all events)
```typescript
{
  metadata: {
    timestamp: string,
    userAgent: string,
    screenWidth: number,
    screenHeight: number,
    timezone: string,
    sessionId: string
  },
  timing: {
    timeOfDay: number,
    dayOfWeek: number,
    isWeekend: boolean,
    hour: number,
    minute: number,
    timeframe: 'morning' | 'afternoon' | 'evening'
  }
}
```

## Amplitude Tips
1. To analyze task priorities:
   ```sql
   WHERE priority_level = 'L'  -- For Leverage tasks
   WHERE priority_level = 'N'  -- For Neutral tasks
   WHERE priority_level = 'O'  -- For Overhead tasks
   ```

2. To compare Today vs Other tasks:
   ```sql
   WHERE category = 'today'    -- For Today's Tasks
   WHERE category = 'other'    -- For Other Tasks
   ```

3. To analyze task completion rates:
   ```sql
   WHERE has_time = true AND estimated_minutes > 0