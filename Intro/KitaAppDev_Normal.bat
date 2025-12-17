@echo off
title Montessori Kita App - Development Server (Normal)

echo Starte Entwicklungsumgebung...

cd /d "C:\Users\abcep\Desktop\Monte"

:: Server im Hintergrund starten und Browser öffnen
start /b cmd /c "timeout /t 2 /nobreak >nul & start chrome http://localhost:5173"

npm run dev

pause
