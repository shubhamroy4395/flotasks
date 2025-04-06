/**
 * Client-side storage utility that uses localStorage for data persistence
 * with server synchronization when available
 */

// Storage keys
const STORAGE_KEYS = {
  TASKS_TODAY: 'flotasks_tasks_today',
  TASKS_OTHER: 'flotasks_tasks_other',
  MOOD: 'flotasks_mood',
  NOTES: 'flotasks_notes',
  GRATITUDE: 'flotasks_gratitude',
  LAST_SYNC: 'flotasks_last_sync',
};

/**
 * Load data from localStorage
 * @param {string} key - Storage key name
 * @returns {Array|null} The stored data or null if not found
 */
export const loadFromStorage = (key) => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS[key]);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return null;
  }
};

/**
 * Save data to localStorage
 * @param {string} key - Storage key name
 * @param {Array} data - Data to store
 * @returns {boolean} Success status
 */
export const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
    return false;
  }
};

/**
 * Clear all stored data
 */
export const clearAllData = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
};

/**
 * Load data with API fallback
 * @param {string} key - Storage key name
 * @param {string} endpoint - API endpoint to fetch from if local data not found
 * @returns {Promise<Array>} The data array
 */
export const loadData = async (key, endpoint) => {
  // First try localStorage
  const localData = loadFromStorage(key);
  
  if (localData) {
    return localData;
  }
  
  // No local data, try API
  try {
    const response = await fetch(`/api/${endpoint}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const apiData = await response.json();
    
    // Save to localStorage
    saveToStorage(key, apiData);
    
    return apiData;
  } catch (error) {
    console.error(`Error fetching from API: ${endpoint}`, error);
    return [];
  }
};

/**
 * Save data to localStorage and sync with API
 * @param {string} key - Storage key name
 * @param {string} endpoint - API endpoint to sync with
 * @param {Array} data - Data to save
 * @param {string} method - HTTP method (POST, PATCH, etc.)
 * @returns {Promise<boolean>} Success status
 */
export const saveData = async (key, endpoint, data, method = 'POST') => {
  // Save to localStorage first (for immediate response)
  saveToStorage(key, data);
  
  // Then sync with API
  try {
    const response = await fetch(`/api/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error syncing with API: ${endpoint}`, error);
    // Data is still in localStorage even if API sync fails
    return false;
  }
}; 