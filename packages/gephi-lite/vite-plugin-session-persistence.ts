import { Plugin } from 'vite';
import fs from 'fs-extra';
import path from 'path';

interface SessionPersistenceOptions {
  sessionFile?: string;
  syncInterval?: number;
}

export function sessionPersistence(options: SessionPersistenceOptions = {}): Plugin {
  const sessionFile = options.sessionFile || path.join(process.cwd(), 'gephi-session.json');
  
  return {
    name: 'session-persistence',
    configureServer(server) {
      console.log('🔧 Session persistence plugin loaded');
      
      // Ensure session file exists
      try {
        fs.ensureFileSync(sessionFile);
        if (!fs.existsSync(sessionFile) || fs.readFileSync(sessionFile, 'utf8').trim() === '') {
          fs.writeFileSync(sessionFile, '{}');
        }
        console.log('📁 Session file initialized:', sessionFile);
      } catch (error) {
        console.error('❌ Error initializing session file:', error);
      }

      // Health check endpoint
      server.middlewares.use('/__health', (req, res) => {
        console.log('🔍 Health check requested');
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            sessionFile: sessionFile
          }));
        } else {
          res.statusCode = 405;
          res.end('Method not allowed');
        }
      });

      // Session API endpoints
      server.middlewares.use('/__session', (req, res) => {
        console.log('📊 Session API called:', req.method);
        
        if (req.method === 'GET') {
          try {
            const sessionData = fs.readJsonSync(sessionFile);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(sessionData));
            console.log('✅ Session data sent');
          } catch (error) {
            console.error('❌ Error reading session:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to read session' }));
          }
        } else if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const sessionData = JSON.parse(body);
              fs.writeJsonSync(sessionFile, sessionData, { spaces: 2 });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
              console.log('✅ Session data saved');
            } catch (error) {
              console.error('❌ Error saving session:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to save session' }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end('Method not allowed');
        }
      });
    },
    
    transformIndexHtml(html) {
      // Inject session persistence script
      const persistenceScript = `
    <script>
      (function() {
        'use strict';
        
        // Configuration
        const SESSION_ENDPOINT = '/__session';
        const SYNC_INTERVAL = ${options.syncInterval || 5000};
        let syncTimer = null;
        let isLoading = false;
        
        // Utility functions
        function log(message, data) {
          console.log('[Gephi Session Manager]', message, data || '');
        }
        
        // Session storage utilities
        function serializeSessionStorage() {
          const data = {};
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) {
              try {
                data[key] = sessionStorage.getItem(key);
              } catch (e) {
                log('Error serializing key:', key);
              }
            }
          }
          return data;
        }
        
        function restoreSessionStorage(data) {
          if (!data || typeof data !== 'object') return;
          
          // Clear existing session storage
          sessionStorage.clear();
          
          // Restore data
          Object.keys(data).forEach(key => {
            try {
              sessionStorage.setItem(key, data[key]);
            } catch (e) {
              log('Error restoring key:', key);
            }
          });
        }
        
        // API functions
        async function loadSession() {
          if (isLoading) return;
          isLoading = true;
          
          try {
            log('Loading session from server...');
            const response = await fetch(SESSION_ENDPOINT, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              const sessionData = await response.json();
              restoreSessionStorage(sessionData);
              log('Session loaded successfully', Object.keys(sessionData).length + ' keys');
            } else {
              log('Failed to load session:', response.status);
            }
          } catch (error) {
            log('Error loading session:', error.message);
          } finally {
            isLoading = false;
          }
        }
        
        async function saveSession() {
          if (isLoading) return;
          
          try {
            const sessionData = serializeSessionStorage();
            const keyCount = Object.keys(sessionData).length;
            
            if (keyCount === 0) {
              return;
            }
            
            log('Saving session to server...', keyCount + ' keys');
            const response = await fetch(SESSION_ENDPOINT, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(sessionData),
            });
            
            if (response.ok) {
              log('Session saved successfully');
            } else {
              log('Failed to save session:', response.status);
            }
          } catch (error) {
            log('Error saving session:', error.message);
          }
        }
        
        // Start periodic sync
        function startSync() {
          if (syncTimer) clearInterval(syncTimer);
          
          syncTimer = setInterval(() => {
            saveSession();
          }, SYNC_INTERVAL);
          
          log('Auto-sync started (interval: ' + SYNC_INTERVAL + 'ms)');
        }
        
        // Stop periodic sync
        function stopSync() {
          if (syncTimer) {
            clearInterval(syncTimer);
            syncTimer = null;
          }
        }
        
        // Initialize on page load
        async function initialize() {
          log('Initializing session persistence...');
          
          // Load session data before the app starts
          await loadSession();
          
          // Start periodic saving
          startSync();
          
          // Save session when page is about to unload
          window.addEventListener('beforeunload', () => {
            stopSync();
            // Use sendBeacon for reliable saving on page unload
            try {
              const sessionData = serializeSessionStorage();
              const blob = new Blob([JSON.stringify(sessionData)], {
                type: 'application/json'
              });
              navigator.sendBeacon(SESSION_ENDPOINT, blob);
              log('Session saved via beacon on page unload');
            } catch (error) {
              log('Error saving session on unload:', error.message);
            }
          });
          
          // Handle visibility changes (tab switching, etc.)
          document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
              saveSession();
            }
          });
          
          log('Session persistence initialized successfully');
        }
        
        // Start initialization when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initialize);
        } else {
          initialize();
        }
        
        // Expose utilities to global scope for debugging
        window.gephiSessionManager = {
          loadSession,
          saveSession,
          serializeSessionStorage,
          restoreSessionStorage,
          startSync,
          stopSync
        };
      })();
    </script>`;
      
      return html.replace('</head>', `${persistenceScript}\n  </head>`);
    }
  };
}
