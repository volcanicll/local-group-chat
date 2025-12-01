#!/bin/bash

# Start backend
echo "Starting backend..."
cd server
bun install
bun start &
SERVER_PID=$!

# Start frontend
echo "Starting frontend..."
cd ../client
bun install
bun run dev &
CLIENT_PID=$!

# Cleanup function
cleanup() {
  echo "Shutting down..."
  kill $SERVER_PID 2>/dev/null
  kill $CLIENT_PID 2>/dev/null
  exit 0
}

# Register cleanup
trap cleanup SIGINT SIGTERM

echo "Application is running!"
echo "Client: http://localhost:3000"
echo "Server: http://localhost:4000"
echo "Press Ctrl+C to stop all services"

# Wait for any process to exit
wait
