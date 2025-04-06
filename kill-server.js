// Helper script to kill processes on port 5001
// For Windows environments

import { exec } from 'child_process';

const PORT = 5001;

console.log(`Looking for processes using port ${PORT}...`);

// For Windows
if (process.platform === 'win32') {
  exec(`netstat -ano | findstr :${PORT}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error finding process: ${error.message}`);
      return;
    }
    
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return;
    }
    
    if (!stdout) {
      console.log(`No process found using port ${PORT}`);
      return;
    }

    // Parse the output to get the PID
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length > 4) {
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(parseInt(pid))) {
          pids.add(pid);
        }
      }
    }
    
    if (pids.size === 0) {
      console.log(`No process found using port ${PORT}`);
      return;
    }
    
    console.log(`Found ${pids.size} process(es) using port ${PORT}`);
    
    // Kill each PID
    for (const pid of pids) {
      console.log(`Killing process with PID ${pid}...`);
      exec(`taskkill /F /PID ${pid}`, (killError, killStdout, killStderr) => {
        if (killError) {
          console.error(`Error killing process: ${killError.message}`);
          return;
        }
        
        if (killStderr) {
          console.error(`Error: ${killStderr}`);
          return;
        }
        
        console.log(`Process with PID ${pid} killed successfully`);
        console.log(killStdout);
      });
    }
  });
} else {
  // For Unix-like systems (macOS, Linux)
  exec(`lsof -i :${PORT} -t`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error finding process: ${error.message}`);
      return;
    }
    
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return;
    }
    
    if (!stdout) {
      console.log(`No process found using port ${PORT}`);
      return;
    }
    
    const pids = stdout.trim().split('\n');
    console.log(`Found ${pids.length} process(es) using port ${PORT}`);
    
    for (const pid of pids) {
      if (pid) {
        console.log(`Killing process with PID ${pid}...`);
        exec(`kill -9 ${pid}`, (killError, killStdout, killStderr) => {
          if (killError) {
            console.error(`Error killing process: ${killError.message}`);
            return;
          }
          
          console.log(`Process with PID ${pid} killed successfully`);
        });
      }
    }
  });
} 