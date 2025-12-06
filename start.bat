@echo off
echo Starting Movie Server...
start "Movie Server Backend" cmd /k "cd server && npm start"
start "Movie Server Frontend" cmd /k "cd client && npm run dev"
echo Servers started in separate windows.
