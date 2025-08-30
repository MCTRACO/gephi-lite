#!/bin/bash

# Gephi Lite with Global Settings Storage
# This script starts both the storage server and the web application

echo "🚀 Starting Gephi Lite with Global Settings Storage..."

# Function to handle cleanup
cleanup() {
    echo "🛑 Shutting down services..."
    if [ ! -z "$STORAGE_PID" ]; then
        echo "Stopping storage server (PID: $STORAGE_PID)..."
        kill $STORAGE_PID 2>/dev/null
    fi
    if [ ! -z "$WEB_PID" ]; then
        echo "Stopping web server (PID: $WEB_PID)..."
        kill $WEB_PID 2>/dev/null
    fi
    exit 0
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

# Check if required dependencies are installed
if [ ! -f "node_modules/express/package.json" ] || [ ! -f "node_modules/cors/package.json" ]; then
    echo "📦 Installing storage server dependencies..."
    npm install express cors
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    
    echo "✅ Dependencies installed successfully"
fi

# Start the storage server in the background
echo "🗄️  Starting global settings storage server on port 3001..."
node storage-server.js &
STORAGE_PID=$!

# Wait a moment for the storage server to start
sleep 2

# Check if storage server started successfully
if ! kill -0 $STORAGE_PID 2>/dev/null; then
    echo "❌ Failed to start storage server"
    exit 1
fi

echo "✅ Storage server started successfully (PID: $STORAGE_PID)"

# Start the main Gephi Lite application
echo "🌐 Starting Gephi Lite web application..."
cd packages/gephi-lite
npm start &
WEB_PID=$!

echo "✅ Gephi Lite started successfully!"
echo ""
echo "📍 Application URLs:"
echo "   • Gephi Lite: http://localhost:5173/gephi-lite/"
echo "   • Storage API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for the web server process
wait $WEB_PID
