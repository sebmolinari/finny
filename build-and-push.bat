@echo off
setlocal

REM ── Set your Docker Hub username and version here ──────────────────────────
set DOCKER_USER=sebmolinari
if "%~1"=="" (
    echo ERROR: version required. Usage: build-and-push.bat 1.2.0
    exit /b 1
)
set VERSION=%~1
set IMAGE=%DOCKER_USER%/finny

REM ── Ensure buildx builder exists ───────────────────────────────────────────
docker buildx inspect finny-builder >nul 2>&1
if errorlevel 1 (
    echo Creating buildx builder...
    docker buildx create --name finny-builder --use
    docker buildx inspect --bootstrap
) else (
    docker buildx use finny-builder
)

echo.
echo Building for linux/amd64 + linux/arm64...
docker buildx build ^
    --platform linux/amd64,linux/arm64 ^
    -t %IMAGE%:%VERSION% ^
    -t %IMAGE%:latest ^
    --push ^
    .

if errorlevel 1 (
    echo.
    echo ERROR: build failed
    exit /b 1
)

echo.
echo Done! Multi-arch images pushed:
echo   %IMAGE%:%VERSION%
echo   %IMAGE%:latest
echo.
echo Supports: Windows/Linux (x64) and Raspberry Pi (ARM64)
