@echo off
title Montessori Kita App - Development Server

echo Starte Entwicklungsumgebung...

cd /d "C:\Users\abcep\Desktop\Monte"

:: Server im Hintergrund starten und Browser öffnen
start /b cmd /c "timeout /t 2 /nobreak >nul & start chrome --incognito http://localhost:5173"

npm run dev

pause
