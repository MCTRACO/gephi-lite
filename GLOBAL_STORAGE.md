# Global Settings Storage

This document explains the new global settings storage system that has been implemented to replace session storage with persistent file-based storage.

## Overview

Previously, all settings in Gephi Lite were stored in the browser's sessionStorage, which meant:
- Settings were lost when the tab was closed
- Settings were not shared between different browser tabs/windows
- Settings were browser-specific and not portable

The new global storage system stores all settings in a global file (`global-settings.json`) that persists across browser sessions and can be shared between different instances of the application.

## What's Changed

### Settings Moved to Global Storage

All of the following settings are now saved globally instead of in sessionStorage:

1. **Session data** (`session`) - Layout parameters and metrics configuration
2. **Filters** (`filters`) - All applied filters and filter history
3. **Appearance** (`appearance`) - Visual appearance settings (colors, sizes, labels, etc.)
4. **Dataset** (`dataset`) - Graph data (for small graphs under 5000 nodes)
5. **Preferences** (`preferences`) - User preferences (theme, locale, etc.)
6. **File state** (`file`) - File management state and recent files
7. **User authentication** (`user`) - User login state and authentication data

### Storage Architecture

The system consists of:

1. **GlobalStorageService** (`packages/gephi-lite/src/core/storage/globalStorage.ts`)
   - Handles communication with the storage server
   - Provides fallback to localStorage when server is offline
   - Includes retry mechanism for failed requests

2. **Storage Server** (`storage-server.js`)
   - Simple Node.js HTTP server running on port 3001
   - Stores settings in `global-settings.json`
   - Provides REST API for settings management

3. **Updated Modules**
   - All core modules updated to use globalStorage instead of sessionStorage
   - Initialize.tsx updated to load all settings from global storage on startup

## How to Use

### Starting the Application

**Option 1: Start everything together (recommended)**
```bash
npm run start:with-storage
```

**Option 2: Start components separately**
```bash
# Terminal 1: Start storage server
npm run start:storage

# Terminal 2: Start application
npm start
```

### Storage Server API

The storage server provides the following endpoints:

- `GET /health` - Health check
- `GET /api/settings` - Get all settings
- `GET /api/settings/{key}` - Get specific setting
- `POST /api/settings/{key}` - Set specific setting
- `DELETE /api/settings` - Clear all settings

### Fallback Behavior

If the storage server is offline:
- Settings are automatically saved to localStorage with `global_` prefix
- Settings are loaded from localStorage as fallback
- Failed saves are queued and retried when server comes back online
- No functionality is lost

## Benefits

1. **Persistence** - Settings survive browser restarts and system reboots
2. **Portability** - Settings file can be backed up or shared
3. **Multi-tab support** - Changes in one tab are reflected in others
4. **Reliability** - Fallback to localStorage ensures nothing is lost
5. **Simplicity** - Easy to understand and maintain

## File Locations

- Settings file: `global-settings.json` (in project root)
- Storage server: `storage-server.js` (in project root)
- Startup script: `start-with-storage.sh` (in project root)

## Configuration

The storage server URL can be configured using environment variables:

```bash
# Custom storage server URL
VITE_STORAGE_SERVER_URL=http://localhost:3001

# Development vs production detection is automatic
```

## Troubleshooting

1. **Storage server not starting**: Check if port 3001 is available
2. **Settings not saving**: Check console for error messages, fallback to localStorage should work
3. **Settings not loading**: Storage server might be down, but localStorage fallback should provide cached settings

## Migration

The system automatically handles migration:
- Existing localStorage settings are preserved as fallback
- First startup loads existing settings into global storage
- No manual migration required
