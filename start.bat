@echo off
title TSE TOTALIZADOR PRO 2026 // BRASIL E ALAGOAS
color 0B
echo ======================================================================
echo    TSE TOTALIZADOR PRO 2026 // PAINEL ULTRA REFRESH (1ms / 1000Hz)
echo    Presidencia da Republica e Governo do Estado de Alagoas
echo ======================================================================
echo.
echo Conectando ao Tribunal Superior Eleitoral (TSE 2026)...

rem Verifica se o servidor ja esta rodando na porta 8080
netstat -ano | findstr :8080 | findstr LISTENING >nul
if %errorlevel% == 0 (
    echo Servidor ja esta ativo na porta 8080.
) else (
    echo Iniciando servidor de sincronizacao em tempo real...
    start "TSE Backend Server" /min python server.py
    timeout /t 2 /nobreak >nul
)

echo Abrindo painel no navegador padrao...
start http://localhost:8080

echo.
echo ======================================================================
echo Painel em execucao com sucesso!
echo Acesse: http://localhost:8080
echo ======================================================================
timeout /t 3 /nobreak >nul
exit
