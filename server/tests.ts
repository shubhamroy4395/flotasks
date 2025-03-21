
import { describe, it, expect } from 'vitest';
import { DatabaseStorage } from './storage';
import { db } from './db';
import { tasks } from '@shared/schema';

describe('Task Management', () => {
  it('should only return tasks for specific date', async () => {
    // Clean up before test
    await db.delete(tasks);
    
    const storage = new DatabaseStorage();
    const date1 = '2025-03-21';
    const date2 = '2025-03-22';
    
    // Create test tasks
    await storage.createTask({
      content: 'Task 1',
      category: 'today',
      date: date1,
      completed: false,
      priority: 0
    });
    
    await storage.createTask({
      content: 'Task 2',
      category: 'today', 
      date: date2,
      completed: false,
      priority: 0
    });

    // Get tasks for date1
    const tasksForDate1 = await storage.getTasks('today', date1);
    expect(tasksForDate1.length).toBe(1);
    expect(tasksForDate1[0].content).toBe('Task 1');

    // Get tasks for date2  
    const tasksForDate2 = await storage.getTasks('today', date2);
    expect(tasksForDate2.length).toBe(1);
    expect(tasksForDate2[0].content).toBe('Task 2');
  });
});
