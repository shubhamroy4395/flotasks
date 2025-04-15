import React, { useState, useEffect } from 'react';

export default function DebugPage() {
  const [buildInfo, setBuildInfo] = useState({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    platform: 'Netlify'
  });

  const [apiStatus, setApiStatus] = useState('Checking...');

  useEffect(() => {
    // Check if API is accessible
    const checkApi = async () => {
      try {
        const response = await fetch('/api/tasks/today');
        if (response.ok) {
          setApiStatus('API is working ✅');
        } else {
          setApiStatus(`API returned status ${response.status} ❌`);
        }
      } catch (error) {
        setApiStatus(`API error: ${error.message} ❌`);
      }
    };
    
    checkApi();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Deployment Debug Page</h1>
      
      <div className="grid gap-6">
        <section className="border p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Build Information</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(buildInfo, null, 2)}
          </pre>
        </section>
        
        <section className="border p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">API Status</h2>
          <div className="bg-gray-100 p-4 rounded text-sm">
            {apiStatus}
          </div>
        </section>
        
        <section className="border p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Environment Variables</h2>
          <div className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            <p>NODE_ENV: {process.env.NODE_ENV || 'not set'}</p>
            <p>BASE_URL: {import.meta.env.BASE_URL || 'not set'}</p>
            <p>Mode: {import.meta.env.MODE || 'not set'}</p>
          </div>
        </section>
      </div>
      
      <div className="mt-8 text-center">
        <a 
          href="/" 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
} 