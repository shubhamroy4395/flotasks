import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import { devtools, persist } from 'zustand/middleware';
import { Task } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

export interface TaskState {
  tasks: {
    today: Task[];
    other: Task[];
  };
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<Task | undefined>;
  deleteTask: (id: number, category: 'today' | 'other') => Promise<boolean>;
  toggleComplete: (id: number, category: 'today' | 'other') => Promise<void>;
  clearError: () => void;
}

// Helper to reliably generate unique IDs
export const generateTaskId = () => {
  return Date.now();
};

export const useTaskStore = create<TaskState>()(
  devtools(
    persist(
      immer((set, get) => ({
        tasks: {
          today: [],
          other: []
        },
        isLoading: false,
        error: null,
        
        fetchTasks: async () => {
          set(state => { state.isLoading = true; });
          
          try {
            // Determine if we're using authenticated or public endpoints
            const isAuthenticated = document.cookie.includes('connect.sid');
            const baseUrl = isAuthenticated ? '/api/tasks' : '/api/public/tasks';
            
            // Fetch both categories
            const [todayRes, otherRes] = await Promise.all([
              fetch(`${baseUrl}/today`),
              fetch(`${baseUrl}/other`)
            ]);
            
            if (!todayRes.ok || !otherRes.ok) {
              throw new Error('Failed to fetch tasks');
            }
            
            const today = await todayRes.json();
            const other = await otherRes.json();
            
            set(state => {
              state.tasks.today = today;
              state.tasks.other = other;
              state.isLoading = false;
              state.error = null;
            });
            
            console.log('[TASK_STORE] Successfully fetched tasks:', { today, other });
          } catch (error) {
            console.error('[TASK_STORE] Error fetching tasks:', error);
            set(state => {
              state.isLoading = false;
              state.error = 'Failed to load tasks';
            });
          }
        },
        
        addTask: async (task) => {
          try {
            // Determine if we're using authenticated or public endpoints
            const isAuthenticated = document.cookie.includes('connect.sid');
            const endpoint = isAuthenticated ? '/api/tasks' : '/api/public/tasks';
            
            // Create an optimistic update with a temporary ID
            const tempId = generateTaskId();
            const tempTask = {
              ...task,
              id: tempId,
              timestamp: new Date()
            } as Task;
            
            // Add to local state first (optimistic update)
            set(state => {
              state.tasks[task.category as 'today' | 'other'].push(tempTask);
            });
            
            // Send to server
            const savedTask = await apiRequest('POST', endpoint, task);
            
            // Update the local state with the server response
            set(state => {
              const category = task.category as 'today' | 'other';
              const index = state.tasks[category].findIndex(t => t.id === tempId);
              
              if (index !== -1) {
                state.tasks[category][index] = savedTask;
              }
            });
            
            console.log('[TASK_STORE] Task added successfully:', savedTask);
            return savedTask;
          } catch (error) {
            console.error('[TASK_STORE] Error adding task:', error);
            set(state => {
              state.error = 'Failed to add task';
            });
            
            // Show error toast
            toast({
              title: 'Error adding task',
              description: 'Your task could not be saved. Please try again.',
              variant: 'destructive'
            });
            
            return undefined;
          }
        },
        
        deleteTask: async (id, category) => {
          try {
            // Determine if we're using authenticated or public endpoints
            const isAuthenticated = document.cookie.includes('connect.sid');
            const baseUrl = isAuthenticated ? '/api/tasks' : '/api/public/tasks';
            
            // Store the task before deletion for rollback
            const taskToDelete = get().tasks[category].find(t => t.id === id);
            if (!taskToDelete) {
              console.error(`[TASK_STORE] Task with ID ${id} not found for deletion`);
              return false;
            }
            
            // Optimistically remove from local state
            set(state => {
              state.tasks[category] = state.tasks[category].filter(task => task.id !== id);
            });
            
            console.log(`[TASK_STORE] Deleting task with ID ${id} from ${category}`);
            
            // Send deletion request to server
            const response = await fetch(`${baseUrl}/${id}`, {
              method: 'DELETE',
              headers: {
                'Accept': 'application/json'
              },
              credentials: 'include'
            });
            
            // Handle success
            if (response.status === 204) {
              console.log(`[TASK_STORE] Successfully deleted task ${id}`);
              
              // Show success toast
              toast({
                title: 'Task deleted',
                description: 'Your task has been removed.',
                variant: 'default'
              });
              
              return true;
            }
            
            // Handle server error but continue with optimistic update
            if (!response.ok) {
              console.error(`[TASK_STORE] Server error deleting task: ${response.status}`);
              
              // We won't roll back the optimistic update to maintain UI consistency
              // The next fetch will sync with the server state
              
              // Show warning toast
              toast({
                title: 'Task removal syncing...',
                description: 'The task was removed locally but still syncing with server.',
                variant: 'default'
              });
              
              return true; // Still return true as the UI was updated
            }
            
            return true;
          } catch (error) {
            console.error('[TASK_STORE] Error deleting task:', error);
            
            // Even on error, we keep the optimistic update for better UX
            // The next fetch will sync with the server state
            
            // Show error toast
            toast({
              title: 'Error syncing deletion',
              description: 'The task was removed locally but could not sync with the server.',
              variant: 'default'
            });
            
            return true; // Still return true as the UI was updated
          }
        },
        
        toggleComplete: async (id, category) => {
          try {
            // Determine if we're using authenticated or public endpoints
            const isAuthenticated = document.cookie.includes('connect.sid');
            const baseUrl = isAuthenticated ? '/api/tasks' : '/api/public/tasks';
            
            // Find the task
            const taskIndex = get().tasks[category].findIndex(t => t.id === id);
            if (taskIndex === -1) {
              console.error(`[TASK_STORE] Task with ID ${id} not found for toggling`);
              return;
            }
            
            // Get current completion status
            const task = get().tasks[category][taskIndex];
            const newCompletionStatus = !task.completed;
            
            // Optimistically update local state
            set(state => {
              state.tasks[category][taskIndex].completed = newCompletionStatus;
            });
            
            // Send update to server
            const response = await fetch(`${baseUrl}/${id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ completed: newCompletionStatus }),
              credentials: 'include'
            });
            
            if (!response.ok) {
              console.error(`[TASK_STORE] Error toggling task completion: ${response.status}`);
              
              // Revert local state on error
              set(state => {
                state.tasks[category][taskIndex].completed = task.completed;
              });
              
              throw new Error('Failed to update task completion status');
            }
            
            const updatedTask = await response.json();
            console.log('[TASK_STORE] Task completion toggled successfully:', updatedTask);
          } catch (error) {
            console.error('[TASK_STORE] Error toggling task completion:', error);
            set(state => {
              state.error = 'Failed to update task';
            });
            
            // Show error toast
            toast({
              title: 'Error updating task',
              description: 'Your task could not be updated. Please try again.',
              variant: 'destructive'
            });
          }
        },
        
        clearError: () => {
          set(state => {
            state.error = null;
          });
        }
      })),
      {
        name: 'task-storage',
        partialize: (state) => ({ 
          tasks: state.tasks 
        }),
      }
    )
  )
);