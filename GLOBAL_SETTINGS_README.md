# Global Settings Storage for Gephi Lite

This implementation adds **global settings persistence** to Gephi Lite, allowing all user settings (preferences, appearance, session data, layout parameters) to be saved permanently across all browsers and sessions.

## 🎯 What This Solves

Previously, Gephi Lite settings were stored locally in browser storage (localStorage/sessionStorage), which meant:
- Settings were lost when switching browsers
- Settings didn't persist across different devices
- Settings were tied to individual browser sessions

Now, **ALL settings are saved globally** on a storage server in the project folder, making them accessible from any browser, device, or session.

## 🚀 Quick Start

### Option 1: Start with Global Storage (Recommended)
```bash
npm run start:with-storage
```

This will:
1. Start the storage server on port 3001
2. Start Gephi Lite on port 5173
3. Enable global settings persistence

### Option 2: Manual Setup
```bash
# Terminal 1: Start storage server
npm run storage-server

# Terminal 2: Start Gephi Lite
npm start
```

## 📁 What Gets Saved Globally

All of these settings are now persistent across browsers and sessions:

### 1. **User Preferences** (`preferences`)
- Theme selection (light/dark/auto)
- Language/locale settings
- Layout parameters for each algorithm
- Metrics configuration and parameters

### 2. **Appearance Settings** (`appearance`)
- Node size, color, and styling
- Edge size, color, and styling
- Background and grid colors
- Label settings and positioning
- Visual appearance customizations

### 3. **Session Data** (`session`)
- Layout algorithm parameters
- Metrics calculations and settings
- Session-specific configurations

### 4. **Layout State** (`layout`)
- Layout quality settings
- Grid visibility preferences
- Layout execution state

## 🏗️ Architecture

### Storage Server
- **Location**: `storage-server.js` in project root
- **Port**: 3001 (configurable via environment)
- **Data Storage**: `global-settings/` folder in project directory
- **API Endpoints**:
  - `GET /api/settings/:key` - Get specific setting
  - `POST /api/settings/:key` - Save specific setting
  - `GET /api/settings` - Get all settings
  - `DELETE /api/settings` - Reset all settings
  - `GET /health` - Server health check

### Frontend Integration
- **Service**: `globalStorage.ts` - Handles server communication
- **Fallback**: Automatically falls back to localStorage if server unavailable
- **Retry Logic**: Queues failed operations for retry when server comes back online
- **Backup**: Always maintains localStorage backup for reliability

### Data Flow
```
User Changes Setting → 
  Global Storage Service → 
    Storage Server (primary) + 
    localStorage (backup)
```

## 📡 Storage Server API

### Get Setting
```http
GET /api/settings/preferences
Response: { "success": true, "data": {...} }
```

### Save Setting
```http
POST /api/settings/preferences
Body: { "data": {...} }
Response: { "success": true }
```

### Get All Settings
```http
GET /api/settings
Response: { "success": true, "data": { "preferences": {...}, "appearance": {...} } }
```

### Reset All Settings
```http
DELETE /api/settings
Response: { "success": true }
```

## 🔧 Configuration

### Environment Variables
```bash
# Storage server URL (optional)
VITE_STORAGE_SERVER_URL=http://localhost:3001

# Storage server port
PORT=3001
```

### Custom Storage Server URL
If you want to use a different storage server:

```typescript
// Will use custom URL if set
const customUrl = import.meta.env.VITE_STORAGE_SERVER_URL;
```

## 📂 File Structure

```
gephi-lite/
├── storage-server.js              # Node.js storage server
├── storage-server-package.json    # Storage server dependencies  
├── start-with-storage.sh          # Startup script
├── global-settings/               # Settings storage directory (auto-created)
│   ├── preferences.json
│   ├── appearance.json
│   ├── session.json
│   └── layout.json
└── packages/gephi-lite/src/core/
    ├── storage/
    │   └── globalStorage.ts       # Global storage service
    ├── preferences/
    │   ├── index.ts              # Updated to use global storage
    │   └── utils.ts              # Added async loading functions
    ├── session/
    │   ├── index.ts              # Updated to use global storage
    │   └── utils.ts              # Added async loading functions
    ├── appearance/
    │   ├── index.ts              # Updated to use global storage
    │   └── storageUtils.ts       # New storage utilities
    └── layouts/
        └── index.ts              # Updated to use global storage
```

## 🛡️ Reliability Features

### Offline Resilience
- Settings continue to work if storage server is down
- Automatic fallback to localStorage
- Queued retry mechanism for failed saves
- Background sync when server comes back online

### Error Handling
- Graceful degradation when server unavailable
- Automatic retries with exponential backoff
- localStorage backup prevents data loss
- User notification of storage status

### Data Consistency
- Always saves to localStorage as backup
- Server sync happens asynchronously
- Conflict resolution favors server data
- Automatic migration from old storage format

## 🎛️ User Interface

A new **Global Settings Storage** panel is added to the user settings, showing:

- ✅ **Storage Status**: Online/Offline indicator
- 🔗 **Server URL**: Current storage server endpoint
- 🔄 **Pending Retries**: Number of operations waiting to sync
- ⚠️ **Offline Warning**: When server is unavailable
- 🗑️ **Reset All Settings**: Danger zone to clear all global settings

## 🔄 Migration

Existing users' settings are automatically migrated:

1. **First Load**: Settings loaded from localStorage (existing behavior)
2. **Background Sync**: Settings automatically uploaded to global storage
3. **Subsequent Loads**: Settings loaded from global storage
4. **Fallback**: localStorage still used as backup

## 🐛 Troubleshooting

### Storage Server Won't Start
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill process using port 3001
kill -9 $(lsof -t -i:3001)

# Start with different port
PORT=3002 npm run storage-server
```

### Settings Not Persisting
1. Check storage server status in Settings panel
2. Check browser console for errors
3. Verify `global-settings/` folder has write permissions
4. Check if localStorage fallback is working

### Reset Everything
```bash
# Stop servers
# Remove settings
rm -rf global-settings/

# Clear browser storage
# In browser console:
localStorage.clear();
sessionStorage.clear();
```

## 🚀 Production Deployment

For production use, consider:

1. **Reverse Proxy**: Use nginx/Apache to serve storage API
2. **Authentication**: Add user authentication to storage server
3. **Database**: Replace file storage with database
4. **Backup**: Implement automated backups of settings
5. **Monitoring**: Add logging and health monitoring

Example nginx config:
```nginx
location /storage-api/ {
    proxy_pass http://localhost:3001/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## 🎉 Benefits

✅ **Cross-Browser Persistence**: Settings work across Chrome, Firefox, Safari, etc.  
✅ **Multi-Device Sync**: Same settings on desktop, laptop, tablet  
✅ **Team Sharing**: Share settings across team members  
✅ **Backup & Recovery**: Settings survive browser clears/reinstalls  
✅ **Reliability**: Automatic fallback ensures settings never lost  
✅ **Performance**: Async loading doesn't block app startup  
✅ **User-Friendly**: Transparent operation with status indicators  

Your Gephi Lite settings are now truly global and permanent! 🌍✨
