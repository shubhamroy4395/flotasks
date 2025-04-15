# TaskFlowSync

A task management and productivity application built with React, Express, and Netlify serverless functions.

## Features

- Task management with today and other categories
- Mood tracking
- Gratitude journal
- Notes
- Focus timer with music integration

## Deployment

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Use the following build settings:
   - Build command: `npm run build`
   - Publish directory: `client/dist`
3. The app includes serverless functions to replace the Express backend

### Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
   
## Data Persistence

TaskFlowSync uses a combination of:
- Local storage for immediate data persistence
- API backend for server-side storage (when deployed)

## Troubleshooting

### Port in Use Error

If you see an error like `EADDRINUSE: address already in use 0.0.0.0:5001`, it means there's already a server running on port 5001. To fix:

Windows:
```
netstat -ano | findstr :5001
taskkill /F /PID <PID>
```

Mac/Linux:
```
lsof -i :5001
kill -9 <PID>
```

Then try starting the server again with `npm run dev`.

## License

MIT 

# TaskFlowSync - Focus Mode Enhancement

## Recent Changes and Improvements

### Focus Mode Dialog Safety Improvements (Latest)
- Removed redundant close button from top-right corner
- Added robust protection against accidental session loss:
  - Blocked dialog closing on outside clicks
  - Prevented Escape key from closing the dialog
  - Added detailed logging for dialog close events
  - Implemented a flag-based system to ensure only intentional close actions are processed
- These improvements prevent users from accidentally losing their focus sessions

### Focus Mode Dialog & Timer Visualization
- Fixed dialog close button functionality with proper event handling
- Added multiple close button options (top-right X and bottom button)
- Implemented comprehensive logging system for tracking user interactions
- Added dual timer visualization options:
  - Circle view with progress bar
  - Pie chart view that resembles a clock face
- Enhanced session visualization with numbered markers to show progress
- Improved differentiation between focus and break periods
- Added toggle button to switch between timer visualization styles

### Focus Mode YouTube Player & UI Fixes
- Made YouTube player visible with controls for better user experience
- Fixed mute/unmute functionality for music playback
- Added error handling for YouTube API interactions
- Removed redundant UI elements for cleaner interface
- Ensured video is displayed with proper aspect ratio
- Improved media controls visibility and interaction

### Focus Mode & Progress Cards Fixes
- Restored original Focus Mode dialog functionality
- Added custom CircularProgress component for better visual feedback
- Fixed issues with YouTube iframe API implementation
- Applied robust CSS selectors for progress cards to futureproof against accidental changes
- Enhanced styling with redundant selectors and !important flags
- Fixed port conflict issues during server startup

### Focus Mode UI Overhaul 
- Converted the Focus Mode from a modal dialog to a full-page layout for better usability
- Implemented a modern two-column grid layout with responsive design
- Added a circular progress indicator for better visual feedback
- Integrated music controls directly into the main interface
- Enhanced visual hierarchy and accessibility

#### Timer Section Improvements
- Large circular progress indicator with centered time display
- Rounded, icon-based control buttons with hover effects
- Improved session duration selector
- Clear visual feedback for active sessions

#### Music Section Enhancements
- Dedicated card for music controls
- Streamlined music selection dropdown
- Improved volume slider with visual feedback
- Enhanced mute/unmute toggle with clear icons
- Better integration with YouTube iframe API

### Theme System Updates
- Enhanced dark theme for better contrast and accessibility
- Updated progress bar colors with gradients and subtle shadows
- Improved card styling across all themes
- Added consistent hover and active states
- Implemented smooth transitions for all interactive elements

## Logging System

TaskFlowSync now includes a comprehensive logging system for debugging and tracking user interactions:

```typescript
// Example log output:
[2023-07-12T15:23:45.123Z] [Dialog] Open state change {"requestedState":true}
[2023-07-12T15:23:50.456Z] [Timer] Started {"mode":"focus","timeLeft":1500}
[2023-07-12T15:24:10.789Z] [Music] Song selected {"songId":"2","title":"Retro Vibes"}
```

## Running the Application

To start the development server:

```bash
# Kill any existing processes on port 5001
# Windows:
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Start the development server
npm run dev
```

## Troubleshooting

If the server fails to start due to port conflicts, try these commands:

```bash
# Find processes using port 5001
netstat -ano | findstr :5001

# Kill the specific process
taskkill /PID <PID> /F

# Alternative approach
Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess | Stop-Process -Force

# Kill all Node.js processes (use with caution)
taskkill /F /FI "IMAGENAME eq node.exe"
```

## Known Issues
- Server port 5001 may sometimes remain in use, requiring a manual process kill
- YouTube iframe API initialization requires a stable internet connection

## Next Steps
- [ ] Add session progress tracking
- [ ] Implement statistics and analytics
- [ ] Add custom music upload capability
- [ ] Enhance notification system 