#!/bin/bash

# Exit on any error
set -e

# Function to handle cleanup on script exit
cleanup() {
  echo -e "\n\033[0;31mStopping all services...\033[0m"
  # Kill all child processes of this script
  pkill -P $$ || true
  exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

echo -e "\033[0;32m🚀 Starting Rotary Arts Platform Development Environment...\033[0m"

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo -e "\n\033[0;33m⚠️ Node.js not found. Installing Node.js via nvm...\033[0m"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
fi

# 1. Start Docker services (Database)
if [ -f "docker-compose.yml" ]; then
  echo -e "\n\033[0;34m📦 Starting Database (Docker)...\033[0m"
  if command -v docker-compose &> /dev/null; then
    docker-compose up -d
  elif docker compose version &> /dev/null; then
    docker compose up -d
  else
    echo -e "\n\033[0;31m❌ Docker or Docker Compose not found.\033[0m"
    echo -e "Please install Docker and Docker Compose, or ensure local PostgreSQL is running."
    # If the user has a local Postgres, we can try to proceed
    if ! pg_isready &> /dev/null; then
      echo -e "\033[0;31mError: No database service found.\033[0m"
      exit 1
    else
      echo -e "\033[0;32mLocal PostgreSQL detected, proceeding...\033[0m"
    fi
  fi
  # Wait for DB to be ready
  sleep 2
else
  echo -e "\n\033[0;33m⚠️ No docker-compose.yml found. Checking local Postgres...\033[0m"
  if ! pg_isready &> /dev/null; then
    echo -e "\033[0;31mError: No database found and no docker-compose.yml present.\033[0m"
    # exit 1 
  fi
fi

# 2. Setup Environment Files if missing
if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
  echo -e "\033[0;34m📄 Creating backend/.env from .env.example...\033[0m"
  cp backend/.env.example backend/.env
fi

if [ ! -f "frontend/.env" ] && [ -f "frontend/.env.example" ]; then
  echo -e "\033[0;34m📄 Creating frontend/.env from .env.example...\033[0m"
  cp frontend/.env.example frontend/.env
fi

# 3. Check node_modules and Install if missing
echo -e "\n\033[0;34m📦 Checking dependencies...\033[0m"
for dir in backend frontend; do
  if [ ! -d "$dir/node_modules" ]; then
    echo -e "\033[0;33m⚠️ $dir/node_modules not found. Installing dependencies...\033[0m"
    (cd "$dir" && npm install)
  fi
done

# 4. Optional: Run Migrations/Push (Drizzle)
echo -e "\n\033[0;34m🗄️  Syncing database schema...\033[0m"
if [ -d "backend" ]; then
  cd backend && npx drizzle-kit push || echo -e "\033[0;33m⚠️ Database sync skipped or failed. Ensure DB is running and .env is correct.\033[0m"
  cd ..
fi

# 5. Start Backend
echo -e "\n\033[0;34m⚙️  Starting Backend (Port 3001)...\033[0m"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# 6. Start Frontend
echo -e "\n\033[0;34m🖥️  Starting Frontend (Port 3000)...\033[0m"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n\033[0;32m✅ Everything is running!\033[0m"
echo -e "\033[0;36m- Frontend: http://localhost:3000\033[0m"
echo -e "\033[0;36m- Backend:  http://localhost:3001\033[0m"
echo -e "\n\033[0;33mPress Ctrl+C to stop all services.\033[0m"

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID
