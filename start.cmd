@echo off
echo Installing dependencies...
cd client && npm install && cd ..
cd server && npm install && cd ..

echo Starting services...
start "Server" cmd /c "cd server && node server.js"
start "Client" cmd /c "cd client && npm run dev"

echo Application is running!
echo Client: http://localhost:3000
echo Server: http://localhost:4000
echo Press Ctrl+C in respective windows to stop services

pause
