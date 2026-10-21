@echo off
echo ==================================================================
echo   ShortDoc (TypeScript Express API + Next.js Frontend)
echo ==================================================================

start "ShortDoc TypeScript Backend API (Port 5000)" cmd /k "cd /d D:\ShortDoc\backend && npm run dev"
timeout /t 3 >nul

if exist "D:\ShortDoc\frontend\.next" (
    echo [TEZKOR REJIM] Pre-compiled Production server ishga tushmoqda...
    start "ShortDoc Frontend Web (Port 3000) [PROD]" cmd /k "cd /d D:\ShortDoc\frontend && npm start"
) else (
    echo [DEV REJIM] Dev server ishga tushmoqda...
    start "ShortDoc Frontend Web (Port 3000) [DEV]" cmd /k "cd /d D:\ShortDoc\frontend && npm run dev"
)

echo.
echo Tizim ishga tushirilmoqda...
echo TypeScript Backend API: http://localhost:5000
echo Swagger Docs:           http://localhost:5000/api/docs
echo Next.js Frontend:       http://localhost:3000
echo.
echo Brauzerda http://localhost:3000 manzilini oching.
pause
