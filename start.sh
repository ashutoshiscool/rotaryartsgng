#!/bin/bash

# Exit on any error
set -e

# Function to handle cleanup on script exit
cleanup() {
  echo -e "\n\033[0;31mStopping all services...\033[0m"
  pkill -P $$ || true
  fuser -k 3000/tcp || true
  exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

echo -e "\033[0;32m🚀 Starting Rotary Arts Platform Development Environment...\033[0m"

if [ ! -f "frontend/.env" ] && [ -f "frontend/.env.example" ]; then
  echo -e "\033[0;34m📄 Creating frontend/.env from .env.example...\033[0m"
  cp frontend/.env.example frontend/.env
fi

echo -e "\n\033[0;34m📦 Checking dependencies...\033[0m"
if [ ! -d "frontend/node_modules" ]; then
  echo -e "\033[0;33m⚠️ frontend/node_modules not found. Installing dependencies...\033[0m"
  (cd frontend && npm install)
fi

fuser -k 3000/tcp || true

echo -e "\n\033[0;34m🖥️  Starting Frontend (Port 3000)...\033[0m"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n\033[0;32m✅ Everything is running!\033[0m"
echo -e "\033[0;36m- Frontend: http://localhost:3000\033[0m"
echo -e "\n\033[0;33mPress Ctrl+C to stop all services.\033[0m"

wait $FRONTEND_PID
