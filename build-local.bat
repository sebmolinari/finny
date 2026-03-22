@echo off
setlocal

set IMAGE=finny:local
set CONTAINER=finny

REM ── Stop and remove existing container if running ──────────────────────────
docker inspect %CONTAINER% >nul 2>&1
if not errorlevel 1 (
    echo Stopping existing container...
    docker stop %CONTAINER% >nul
    docker rm %CONTAINER% >nul
)

REM ── Remove old local image ─────────────────────────────────────────────────
docker image inspect %IMAGE% >nul 2>&1
if not errorlevel 1 (
    echo Removing old image...
    docker rmi %IMAGE% >nul
)

REM ── Build ──────────────────────────────────────────────────────────────────
echo.
echo Building %IMAGE%...
docker buildx build --platform linux/amd64 --load -t %IMAGE% .

if errorlevel 1 (
    echo.
    echo ERROR: build failed
    exit /b 1
)

REM ── Run ────────────────────────────────────────────────────────────────────
echo.
echo Starting container...
docker run -d -p 0:5000 -v finny_data:/app/data --env-file .\backend\.env --name %CONTAINER% %IMAGE%

if errorlevel 1 (
    echo.
    echo ERROR: container failed to start
    exit /b 1
)

REM ── Show port ──────────────────────────────────────────────────────────────
echo.
for /f "tokens=*" %%p in ('docker port %CONTAINER% 5000') do set PORT_LINE=%%p
echo Container running at http://localhost:%PORT_LINE:0.0.0.0:=%
echo.
echo To stop:  docker stop %CONTAINER% ^& docker rm %CONTAINER%
