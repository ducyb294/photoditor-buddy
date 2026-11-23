@echo off
rem Starts the photoditor-buddy dev server. Close this window (or press Ctrl+C) to stop it.
title photoditor-buddy server
cd /d "%~dp0"

if not exist node_modules (
  echo First run: installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

rem Open the browser a few seconds after the server starts.
start "" /b cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:2942"

echo Server running at http://localhost:2942  (close this window to stop)
call npm run dev --workspace=apps/web -- --port 2942 --strictPort

echo.
echo Server stopped.
pause
