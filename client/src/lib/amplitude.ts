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
  TASK_LIST_TODAY_OPEN: 'Task List Today View',
  TASK_LIST_OTHER_OPEN: 'Task List Other View',
  TASK_CREATED: 'Task Created',
  TASK_COMPLETED: 'Task Completed',
  TASK_DELETED: 'Task Deleted',
  TASK_PRIORITY_CHANGED: 'Task Priority Changed',
  TASK_TIME_SET: 'Task Time Set',
  TASKS_SORTED: 'Tasks Sorted',

  // Mood related events
  MOOD_SECTION_OPEN: 'Mood Section Open',
  MOOD_SELECTED: 'Mood Selected',

  // Gratitude related events
  GRATITUDE_SECTION_OPEN: 'Gratitude Section Open',
  GRATITUDE_ADDED: 'Gratitude Added',
  GRATITUDE_DELETED: 'Gratitude Deleted',

  // Notes related events
  NOTES_SECTION_OPEN: 'Notes Section Open',
  NOTE_CREATED: 'Note Created',
  NOTE_DELETED: 'Note Deleted',

  // Reminder related events
  REMINDER_SECTION_OPEN: 'Reminder Section Open',
  REMINDER_SET: 'Reminder Set',
  REMINDER_COMPLETED: 'Reminder Completed',
  REMINDER_DELETED: 'Reminder Deleted',

  // Goal related events
  GOALS_SECTION_OPEN: 'Goals Section Open',
  GOAL_CREATED: 'Goal Created',
  GOAL_UPDATED: 'Goal Updated',
  GOAL_COMPLETED: 'Goal Completed',
  GOAL_DELETED: 'Goal Deleted',

  // Navigation events
  NAV_ITEM_CLICKED: 'Navigation Item Clicked',
  SECTION_EXPANDED: 'Section Expanded',
  SECTION_COLLAPSED: 'Section Collapsed',

  // UI Interaction events
  UI_THEME_CHANGED: 'Theme Changed',
  UI_FILTER_APPLIED: 'Filter Applied',
  UI_SORT_CHANGED: 'Sort Option Changed',
  UI_MODAL_OPENED: 'Modal Opened',
  UI_MODAL_CLOSED: 'Modal Closed'
};

// Helper function to track events with properties
export const trackEvent = (
  eventName: string, 
  eventProperties?: Record<string, any>
) => {
  // Add common properties to all events
  const commonProps = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  };

  amplitude.track(eventName, {
    ...commonProps,
    ...eventProperties
  });
};

export default amplitude;