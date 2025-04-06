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