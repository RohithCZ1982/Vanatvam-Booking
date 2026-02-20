#!/bin/bash

echo "Stopping existing services..."

# Kill process on port 8000 (Backend)
BACKEND_PIDS=$(lsof -t -i:8000)
if [ ! -z "$BACKEND_PIDS" ]; then
    echo "Killing processes on port 8000: $BACKEND_PIDS"
    kill -9 $BACKEND_PIDS 2>/dev/null
fi

# Kill process on port 3000 (Frontend)
FRONTEND_PIDS=$(lsof -t -i:3000)
if [ ! -z "$FRONTEND_PIDS" ]; then
    echo "Killing processes on port 3000: $FRONTEND_PIDS"
    kill -9 $FRONTEND_PIDS 2>/dev/null
fi

# Trap Ctrl+C to automatically kill the backend when this script exits
trap "echo -e '\nStopping services...'; kill \$BACKEND_PID 2>/dev/null; exit 0" INT TERM EXIT

echo "Starting Backend in the background..."
# Start backend
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

echo "========================================="
echo "Application is starting!"
echo "Backend is running in the background (PID: $BACKEND_PID)"
echo "Starting Frontend in the CURRENT terminal..."
echo "Press Ctrl+C at any time to kill BOTH the frontend and backend."
echo "========================================="

# Start frontend in the foreground
cd frontend
npm start
