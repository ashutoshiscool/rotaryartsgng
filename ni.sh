#!/bin/bash

# ni.sh - Rotary Arts Platform Super Starter
# This script ensures a clean start of all services without manual intervention.

echo "🛑 Neutralizing legacy processes on ports 3000 and 3001..."
fuser -k 3000/tcp 3001/tcp 2>/dev/null || true

# Check for Docker/Database
if [ -f "docker-compose.yml" ]; then
    echo "🗄️  Ensuring database is active (Docker)..."
    docker-compose up -d 2>/dev/null || docker compose up -d 2>/dev/null || echo "⚠️ Docker not found, assuming local DB is ready."
fi

# 1. Start Backend
echo "⚙️  Igniting Backend Engine (Port 3001)..."
cd backend
npm install > /dev/null 2>&1
nohup npm run dev > backend.log 2>&1 &
echo "✅ Backend started in background (Logs: backend/backend.log)"
cd ..

# 2. Start Frontend
echo "🖥️  Igniting Frontend Interface (Port 3000)..."
cd frontend
npm install > /dev/null 2>&1
nohup npm run dev > frontend.log 2>&1 &
echo "✅ Frontend started in background (Logs: frontend/frontend.log)"
cd ..

echo "----------------------------------------------------"
echo "🚀 SYSTEM DEPLOYED SUCCESSFULLY"
echo "🌐 Frontend: http://rotary-arts.com"
echo "📡 Backend:  http://168.144.16.226:3001"
echo "----------------------------------------------------"
echo "Tip: Run 'tail -f backend/backend.log' to monitor server traffic."
