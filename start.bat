@echo off
REM SmartERP - hem backend, hem frontend-i ise salir
echo SmartERP ise salinir...

start "SmartERP Backend" cmd /k "cd /d "%~dp0backend\src\SmartERP.API" && dotnet run --launch-profile http"
start "SmartERP Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Backend:  http://localhost:5042/swagger
echo Frontend: http://localhost:5173
echo.
timeout /t 8 >nul
start http://localhost:5173
