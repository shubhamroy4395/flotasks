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
  // Task related events - with specific category tracking
  TaskToday: {
    View: 'TaskToday.View',
    Created: 'TaskToday.Created',
    Completed: 'TaskToday.Completed',
    Edited: 'TaskToday.Edited',
    Deleted: 'TaskToday.Deleted',
    Exported: 'TaskToday.Exported',
    PriorityChanged: 'TaskToday.PriorityChanged',
    TimeSet: 'TaskToday.TimeSet',
    Sorted: 'TaskToday.Sorted',
    Updated: 'TaskToday.Updated'
  },
  TaskOther: {
    View: 'TaskOther.View',
    Created: 'TaskOther.Created',
    Completed: 'TaskOther.Completed',
    Edited: 'TaskOther.Edited',
    Deleted: 'TaskOther.Deleted',
    Exported: 'TaskOther.Exported',
    PriorityChanged: 'TaskOther.PriorityChanged',
    TimeSet: 'TaskOther.TimeSet',
    Sorted: 'TaskOther.Sorted',
    Updated: 'TaskOther.Updated'
  },
  Mood: {
    SectionOpen: 'Mood.SectionOpen',
    Selected: 'Mood.Selected'
  },
  Gratitude: {
    SectionOpen: 'Gratitude.SectionOpen',
    Added: 'Gratitude.Added',
    Deleted: 'Gratitude.Deleted'
  },
  Notes: {
    SectionOpen: 'Notes.SectionOpen',
    Created: 'Notes.Created',
    Deleted: 'Notes.Deleted'
  },
  Reminder: {
    SectionOpen: 'Reminder.SectionOpen',
    Set: 'Reminder.Set',
    Completed: 'Reminder.Completed',
    Deleted: 'Reminder.Deleted'
  },
  Goals: {
    SectionOpen: 'Goals.SectionOpen',
    Created: 'Goals.Created',
    Updated: 'Goals.Updated',
    Completed: 'Goals.Completed',
    Deleted: 'Goals.Deleted'
  },
  UI: {
    ModalOpened: 'UI.ModalOpened',
    ModalClosed: 'UI.ModalClosed',
    ThemeChanged: 'UI.ThemeChanged',
    FilterApplied: 'UI.FilterApplied',
    SortChanged: 'UI.SortChanged'
  }
};

// Helper function to track events with properties
export const trackEvent = (
  eventName: string, 
  eventProperties?: Record<string, any>
) => {
  // Add common properties to all events
  const commonProps = {
    metadata: {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sessionId: Date.now().toString(),
    },
    timing: {
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isWeekend: [0, 6].includes(new Date().getDay()),
      hour: new Date().getHours(),
      minute: new Date().getMinutes(),
      timeframe: new Date().getHours() < 12 ? 'morning' : 
                new Date().getHours() < 17 ? 'afternoon' : 'evening'
    }
  };

  amplitude.track(eventName, {
    ...commonProps,
    ...eventProperties
  });
};

export default amplitude;