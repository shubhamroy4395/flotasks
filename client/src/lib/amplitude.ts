import * as amplitude from '@amplitude/analytics-browser';

amplitude.init('ad21a3a1e9ba786379ac4ae8a6fdb010', {
  defaultTracking: {
    sessions: true,
    pageViews: true,
    formInteractions: true,
    fileDownloads: true,
  },
  logLevel: amplitude.Types.LogLevel.Warn
});

export const track = (eventType: string, eventProperties?: Record<string, any>) => {
  amplitude.track(eventType, eventProperties);
};

export const Events = {
  // Task related events - with specific category tracking
  TaskToday: {
    View: 'TaskToday.View',
    Created: 'TaskToday.Created',
    Completed: 'TaskToday.Completed',
    Edited: 'TaskToday.Edited',
    Deleted: 'TaskToday.Deleted',
    PriorityChanged: 'TaskToday.PriorityChanged',
    TimeSet: 'TaskToday.TimeSet',
    Sorted: 'TaskToday.Sorted'
  },
  TaskOther: {
    View: 'TaskOther.View',
    Created: 'TaskOther.Created',
    Completed: 'TaskOther.Completed',
    Edited: 'TaskOther.Edited',
    Deleted: 'TaskOther.Deleted',
    PriorityChanged: 'TaskOther.PriorityChanged',
    TimeSet: 'TaskOther.TimeSet',
    Sorted: 'TaskOther.Sorted'
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


export default amplitude;