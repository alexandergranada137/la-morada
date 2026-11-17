@echo off
setlocal
cd /d "%~dp0"
title La Morada - Red local

where node >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js 22.13 o posterior y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist "node_modules\vinext\dist\cli.js" (
  echo Ejecuta npm install en esta carpeta antes de iniciar el servidor.
  pause
  exit /b 1
)

node scripts\start-lan.mjs %*
if errorlevel 1 pause
