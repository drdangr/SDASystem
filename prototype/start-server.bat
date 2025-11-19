@echo off
REM Скрипт для запуска локального сервера (Windows)

echo Запуск локального сервера для прототипа...
echo.
echo Сервер будет доступен по адресу:
echo   http://localhost:8000
echo.
echo Откройте в браузере:
echo   http://localhost:8000/graph-demo.html
echo.
echo Для остановки нажмите Ctrl+C
echo.

cd /d "%~dp0"
python -m http.server 8000

