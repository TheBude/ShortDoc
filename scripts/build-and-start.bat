@echo off
echo ==================================================================
echo   ShortDoc — Production uchun Build va Ishga tushirish
echo ==================================================================

echo 1/2. TypeScript Backend tekshirilmoqda va yig'ilmoqda...
cd /d D:\ShortDoc\backend
call npm run build
if %errorlevel% neq 0 (
    echo [XATO] Backend build jarayonida xatolik yuz berdi!
    pause
    exit /b %errorlevel%
)

echo.
echo 2/2. Next.js Frontend optimal ishlab chiqarish uchun yig'ilmoqda (build)...
cd /d D:\ShortDoc\frontend
call npm run build
if %errorlevel% neq 0 (
    echo [XATO] Frontend build jarayonida xatolik yuz berdi!
    pause
    exit /b %errorlevel%
)

echo.
echo ==================================================================
echo   Muvaffaqiyatli yig'ildi! Tizim ishga tushirilmoqda...
echo ==================================================================

start "ShortDoc TypeScript API (Port 5000)" cmd /k "cd /d D:\ShortDoc\backend && npm start"
timeout /t 3 >nul
start "ShortDoc Frontend Web (Port 3000)" cmd /k "cd /d D:\ShortDoc\frontend && npm start"

echo.
echo Backend API:      http://localhost:5000
echo Swagger Docs:     http://localhost:5000/api/docs
echo Next.js Frontend: http://localhost:3000
echo.
echo Brauzerda http://localhost:3000 manzilini oching.
pause
