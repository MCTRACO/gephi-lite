#!/bin/bash

# Start storage server in background
echo "Starting global storage server..."
npm run start:storage &
STORAGE_PID=$!

# Wait a moment for storage server to start
sleep 2

# Start the main application
echo "Starting Gephi Lite..."
npm start

# When main app exits, kill storage server
kill $STORAGE_PID 2>/dev/null || true
echo "Storage server stopped."
