import type { Task } from "@shared/schema";

// Format date in iCalendar format: 20220530T090000Z
function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Create an iCalendar (.ics) file content from a task
export function createICalEvent(task: Task, dueDate?: Date): string {
  // If no due date provided, set it to today at noon
  const eventDate = dueDate || new Date();
  
  // For tasks without specific times, set a default duration of 1 hour
  const startDate = formatICalDate(eventDate);
  const endDate = formatICalDate(new Date(eventDate.getTime() + 60 * 60 * 1000)); // 1 hour later
  
  // Generate unique ID for the calendar event
  const uid = `task-${task.id}-${Date.now()}@flotasks.app`;
  
  // Format the task description with relevant details
  const description = `Priority: ${task.priority}\nDifficulty: ${task.difficulty}\nCategory: ${task.category}`;
  
  // Build the iCalendar content
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FloTasks//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${task.content}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

// Download an iCalendar file
export function downloadICalFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate Google Calendar add event URL
export function getGoogleCalendarUrl(task: Task, dueDate?: Date): string {
  const eventDate = dueDate || new Date();
  const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000); // 1 hour later
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: task.content,
    dates: `${formatICalDate(eventDate).slice(0, -1)}/${formatICalDate(endDate).slice(0, -1)}`,
    details: `Priority: ${task.priority}\nDifficulty: ${task.difficulty}\nCategory: ${task.category}`,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Generate Outlook Calendar add event URL
export function getOutlookCalendarUrl(task: Task, dueDate?: Date): string {
  const eventDate = dueDate || new Date();
  const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000); // 1 hour later
  
  const params = new URLSearchParams({
    subject: task.content,
    startdt: eventDate.toISOString(),
    enddt: endDate.toISOString(),
    body: `Priority: ${task.priority}\nDifficulty: ${task.difficulty}\nCategory: ${task.category}`,
  });
  
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// Generate Todoist add task URL
export function getTodoistUrl(task: Task, dueDate?: Date): string {
  const params = new URLSearchParams({
    text: task.content,
    description: `Priority: ${task.priority}\nDifficulty: ${task.difficulty}\nCategory: ${task.category}`,
  });
  
  // Add due date if provided
  if (dueDate) {
    params.append('due_date', dueDate.toISOString().split('T')[0]);
  }
  
  return `https://todoist.com/app/task?${params.toString()}`;
}

// Generate Microsoft To Do add task URL
export function getMicrosoftTodoUrl(task: Task): string {
  // Microsoft To Do uses a simpler format with basic params
  const params = new URLSearchParams({
    title: task.content,
    description: `Priority: ${task.priority}\nDifficulty: ${task.difficulty}\nCategory: ${task.category}`,
  });
  
  return `https://to-do.office.com/tasks/createtask?${params.toString()}`;
}

// Main export function to handle all calendar and task exports
export interface CalendarExportOptions {
  task: Task;
  dueDate?: Date;
  service: 'google' | 'outlook' | 'ical' | 'todoist' | 'microsoft-todo';
}

export function exportTaskToCalendar({ task, dueDate, service }: CalendarExportOptions): void {
  switch (service) {
    case 'google':
      window.open(getGoogleCalendarUrl(task, dueDate), '_blank');
      break;
      
    case 'outlook':
      window.open(getOutlookCalendarUrl(task, dueDate), '_blank');
      break;
      
    case 'ical':
      const icalContent = createICalEvent(task, dueDate);
      downloadICalFile(`${task.content.slice(0, 20)}.ics`, icalContent);
      break;
      
    case 'todoist':
      window.open(getTodoistUrl(task, dueDate), '_blank');
      break;
      
    case 'microsoft-todo':
      window.open(getMicrosoftTodoUrl(task), '_blank');
      break;
      
    default:
      console.error('Unknown calendar service:', service);
  }
}

// Create popup with calendar export options
export function showCalendarExportPopup(task: Task, dueDate?: Date): void {
  // Create a fresh copy of the task to ensure we're using the latest data
  const taskCopy: Task = { ...task };
  
  const left = window.innerWidth / 2 - 300;
  const top = window.innerHeight / 2 - 200;
  
  const popup = window.open(
    '',
    'Export Task',
    `width=600,height=400,left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
  );
  
  if (popup) {
    popup.document.write(`
      <html>
        <head>
          <title>Export Task</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 20px;
              background: #f8f9fa;
              color: #333;
            }
            h2 {
              margin-bottom: 10px;
            }
            .task-preview {
              background: white;
              padding: 15px;
              border-radius: 8px;
              margin: 15px 0;
              border: 1px solid #ddd;
            }
            .export-options {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .export-button {
              display: flex;
              align-items: center;
              padding: 12px 16px;
              border-radius: 8px;
              border: none;
              font-weight: 500;
              cursor: pointer;
              text-decoration: none;
              color: white;
              transition: opacity 0.2s;
            }
            .export-button:hover {
              opacity: 0.9;
            }
            .google {
              background: #4285F4;
            }
            .outlook {
              background: #0078D4;
            }
            .ical {
              background: #5E5E5E;
            }
            .todoist {
              background: #E44332;
            }
            .microsoft {
              background: #2564CF;
            }
          </style>
        </head>
        <body>
          <h2>Export Task to Calendar/Todo App</h2>
          <div class="task-preview">
            <p><strong>${taskCopy.content}</strong></p>
            <p>Priority: ${taskCopy.priority}</p>
            <p>Difficulty: ${taskCopy.difficulty || 'Not specified'}</p>
            <p>Category: ${taskCopy.category}</p>
            ${dueDate ? `<p>Due: ${dueDate.toLocaleDateString()} ${dueDate.toLocaleTimeString()}</p>` : ''}
          </div>
          <div class="export-options">
            <a href="${getGoogleCalendarUrl(taskCopy, dueDate)}" target="_blank" class="export-button google">Add to Google Calendar</a>
            <a href="${getOutlookCalendarUrl(taskCopy, dueDate)}" target="_blank" class="export-button outlook">Add to Outlook Calendar</a>
            <button onclick="downloadIcal()" class="export-button ical">Download .ics File</button>
            <a href="${getTodoistUrl(taskCopy, dueDate)}" target="_blank" class="export-button todoist">Add to Todoist</a>
            <a href="${getMicrosoftTodoUrl(taskCopy)}" target="_blank" class="export-button microsoft">Add to Microsoft To Do</a>
          </div>
          <script>
            function downloadIcal() {
              const icalContent = \`${createICalEvent(taskCopy, dueDate)}\`;
              const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = "${taskCopy.content.slice(0, 20)}.ics";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          </script>
        </body>
      </html>
    `);
  }
}