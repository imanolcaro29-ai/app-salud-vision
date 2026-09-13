@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 24 LTS desde https://nodejs.org y volve a abrir este archivo.
  pause
  exit /b 1
)
echo Abri http://localhost:3000 en tu navegador cuando aparezca el mensaje de inicio.
call npm run demo
pause
