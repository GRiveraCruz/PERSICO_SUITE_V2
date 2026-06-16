@echo off
title Persico Mex — Suite Unificada
echo.
echo  ============================================================
echo   Persico Mex Suite
echo  ============================================================
echo.
cd /d "%~dp0"

echo  Verificando dependencias...
pip install flask openpyxl --quiet --break-system-packages 2>nul
pip install xlrd==1.2.0 --quiet --break-system-packages 2>nul
echo  OK

echo.
echo  Iniciando servidor en http://localhost:5000
echo  (Presiona Ctrl+C para detener)
echo.
python app.py
pause
