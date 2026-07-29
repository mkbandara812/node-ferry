@echo off
echo =========================================
echo       Starting NodeFerry Project
echo =========================================

echo Starting Backend Signaling Server (Port 8080)...
start "NodeFerry Backend" cmd /k "cd backend && npm start"

echo Starting Frontend Next.js Server (Port 3000)...
start "NodeFerry Frontend" cmd /k "cd frontend && npm run dev"

echo Done! Both servers are starting in separate windows.
echo Frontend will be available at http://localhost:3000
