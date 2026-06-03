# Rotary Arts Platform

Welcome to the Rotary Arts Platform! 

## Getting Started

To get started with the project, simply run the included `start.sh` script.

This script automates the full setup process for the frontend and backend applications, including:
- Checking and installing dependencies such as `curl` and `Node.js` (via `nvm`) if missing.
- Starting the PostgreSQL database via Docker Compose.
- Generating environment variables if they don't exist.
- Installing all required `node_modules` for both the frontend and backend.
- Syncing database schemas.
- Concurrently starting both the frontend (Next.js) and the backend (Express/TS).

```bash
# Make sure the script is executable
chmod +x start.sh

# Run the setup and start script
./start.sh
```

## Services

- **Frontend:** Runs by default on [http://localhost:3000](http://localhost:3000)
- **Backend:** Runs by default on [http://localhost:3001](http://localhost:3001)

## Stopping

To cleanly stop the development environment, simply press `Ctrl+C` in the terminal where the script is running. The script will automatically clean up background processes.
