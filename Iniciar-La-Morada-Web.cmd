@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title La Morada Web - Servidor local

echo =============================================
echo        LA MORADA WEB - SERVIDOR LOCAL
echo =============================================
echo Carpeta: %CD%
echo.

REM Si existe package.json, usa el servidor del proyecto (Vite, Next, React, etc.).
if exist "package.json" (
    where npm >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Instala Node.js desde https://nodejs.org/
        goto :error
    )
    if not exist "node_modules" (
        echo Instalando dependencias del proyecto...
        call npm install
        if errorlevel 1 goto :error
    )
    echo Iniciando servidor de desarrollo...
    REM La mayoria de los proyectos Vite usan 5173; Next.js suele usar 3000.
    findstr /i /c:"\"next\"" "package.json" >nul 2>&1
    if not errorlevel 1 (
        set "WEB_URL=http://localhost:3000"
    ) else (
        set "WEB_URL=http://localhost:5173"
    )
    start "" "%WEB_URL%"
    call npm run dev
    if errorlevel 1 goto :error
    goto :end
)

REM Proyecto HTML/CSS/JS sin package.json: inicia servidor estatico con Python.
where py >nul 2>&1
if not errorlevel 1 (
    start "" "http://localhost:8000"
    py -m http.server 8000
    goto :end
)
where python >nul 2>&1
if not errorlevel 1 (
    start "" "http://localhost:8000"
    python -m http.server 8000
    goto :end
)

echo ERROR: No hay package.json y no se encontro Python.
echo Instala Python desde https://www.python.org/downloads/
goto :error

:error
echo.
echo No se pudo iniciar el servidor. Revisa los mensajes anteriores.
pause
:end
endlocal
