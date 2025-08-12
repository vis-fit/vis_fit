@echo off
echo [1/3] Matando processos na porta 3000...
netstat -ano | findstr :3000 > nul
if %errorlevel% equ 0 (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        taskkill /PID %%a /F > nul
    )
    echo Processos na porta 3000 encerrados.
) else (
    echo Nenhum processo encontrado na porta 3000.
)

echo [2/3] Limpando cache do Node...
rd /s /q node_modules > nul 2>&1
del package-lock.json > nul 2>&1

echo [3/3] Reiniciando servidor...
npm install
node server.js

pause