@echo off
set "PATH=C:\Program Files\dotnet;%PATH%"
echo ==================================================================
echo   ShortDoc — Ishlab chiqarish (Production) uchun Build va Ishga tushirish
echo ==================================================================

echo 1/2. C# Backend tekshirilmoqda...
cd /d D:\ShortDoc\backend
dotnet build -c Release
if %errorlevel% neq 0 (
    echo [XATO] C# Backend build jarayonida xatolik yuz berdi!
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
echo   Muvaffaqiyatli yig'ildi! Tizim eng yuqori tezlikda ishga tushirilmoqda...
echo ==================================================================

start "ShortDoc C# API (Port 5000)" cmd /k "set PATH=C:\Program Files\dotnet;%%PATH%% && cd /d D:\ShortDoc\backend && dotnet run -c Release"
timeout /t 3 >nul
start "ShortDoc Frontend Web (Port 3000)" cmd /k "cd /d D:\ShortDoc\frontend && npm start"

echo.
echo C# Backend API:   http://localhost:5000
echo Swagger Docs:     http://localhost:5000/api/docs
echo Next.js Frontend:  http://localhost:3000
echo.
echo Brauzerda http://localhost:3000 manzilini oching.
pause
