#!/bin/bash

# 启动后端服务器
start_server() {
  echo "Starting server..."
  cd server && node server.js &
  SERVER_PID=$!
}

# 启动前端开发服务器
start_client() {
  echo "Starting client..."
  cd client && npm run dev &
  CLIENT_PID=$!
}

# 清理函数
cleanup() {
  echo "Shutting down..."
  kill $SERVER_PID 2>/dev/null
  kill $CLIENT_PID 2>/dev/null
  exit 0
}

# 注册清理函数
trap cleanup SIGINT SIGTERM

# 安装依赖
echo "Installing dependencies..."
(cd client && npm install)
(cd server && npm install)

# 启动服务
start_server
start_client

echo "Application is running!"
echo "Client: http://localhost:3000"
echo "Server: http://localhost:4000"
echo "Press Ctrl+C to stop all services"

# 等待任意子进程结束
wait
