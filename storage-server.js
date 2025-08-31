#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const STORAGE_FILE = path.join(__dirname, 'global-settings.json');

// Ensure storage file exists
if (!fs.existsSync(STORAGE_FILE)) {
  fs.writeFileSync(STORAGE_FILE, '{}');
}

function loadSettings() {
  try {
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load settings:', error.message);
    return {};
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error.message);
    return false;
  }
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function handleRequest(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Health check
  if (url.pathname === '/health') {
    sendJSON(res, 200, { success: true, message: 'Server is running' });
    return;
  }

  // Get all settings
  if (url.pathname === '/api/settings' && req.method === 'GET') {
    const settings = loadSettings();
    sendJSON(res, 200, { success: true, data: settings });
    return;
  }

  // Delete all settings
  if (url.pathname === '/api/settings' && req.method === 'DELETE') {
    if (saveSettings({})) {
      sendJSON(res, 200, { success: true });
    } else {
      sendJSON(res, 500, { success: false, error: 'Failed to reset settings' });
    }
    return;
  }

  // Individual setting operations
  const settingMatch = url.pathname.match(/^\/api\/settings\/(.+)$/);
  if (settingMatch) {
    const key = decodeURIComponent(settingMatch[1]);
    
    if (req.method === 'GET') {
      const settings = loadSettings();
      const value = settings[key] || null;
      sendJSON(res, 200, { success: true, data: value });
      return;
    }
    
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const { data } = JSON.parse(body);
          const settings = loadSettings();
          
          if (data === null) {
            delete settings[key];
          } else {
            settings[key] = data;
          }
          
          if (saveSettings(settings)) {
            sendJSON(res, 200, { success: true });
          } else {
            sendJSON(res, 500, { success: false, error: 'Failed to save setting' });
          }
        } catch (error) {
          sendJSON(res, 400, { success: false, error: 'Invalid JSON' });
        }
      });
      return;
    }
  }

  // 404 for all other routes
  sendJSON(res, 404, { success: false, error: 'Not found' });
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Global storage server running on port ${PORT}`);
  console.log(`Storage file: ${STORAGE_FILE}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down storage server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down storage server...');
  server.close(() => {
    process.exit(0);
  });
});
