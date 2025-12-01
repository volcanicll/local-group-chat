@echo off
echo Starting backend...
cd server
call bun install
start "Server" bun start

echo Starting frontend...
cd ../client
call bun install
start "Client" bun run dev

echo Application is running!
echo Client: http://localhost:3000
echo Server: http://localhost:4000
echo Press Ctrl+C in respective windows to stop services

pause
