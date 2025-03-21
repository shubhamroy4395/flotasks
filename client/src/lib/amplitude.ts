import * as amplitude from '@amplitude/analytics-browser';

// Initialize Amplitude with project key
amplitude.init('ad21a3a1e9ba786379ac4ae8a6fdb010', {
  defaultTracking: {
    sessions: true,
    pageViews: true,
    formInteractions: true,
    fileDownloads: true,
  }
});

// Custom event types
export const Events = {
  // Task related events
  TASK_CREATED: 'Task Created',
  TASK_COMPLETED: 'Task Completed',
  TASK_DELETED: 'Task Deleted',
  TASKS_SORTED: 'Tasks Sorted',
  
  // Mood related events
  MOOD_SELECTED: 'Mood Selected',
  
  // Gratitude related events
  GRATITUDE_ADDED: 'Gratitude Added',
  GRATITUDE_DELETED: 'Gratitude Deleted',
  
  // Notes related events
  NOTE_CREATED: 'Note Created',
  NOTE_DELETED: 'Note Deleted',
  
  // Reminder related events
  REMINDER_SET: 'Reminder Set',
  REMINDER_COMPLETED: 'Reminder Completed',
  
  // Goal related events
  GOAL_CREATED: 'Goal Created',
  GOAL_UPDATED: 'Goal Updated'
};

// Helper function to track events with properties
export const trackEvent = (
  eventName: string, 
  eventProperties?: Record<string, any>
) => {
  amplitude.track(eventName, eventProperties);
};

export default amplitude;
