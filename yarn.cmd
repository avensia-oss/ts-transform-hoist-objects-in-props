@echo off

set FILENAME="%~dp0.nvmrc"
set /p NODE_VERSION=< %FILENAME%

call %~dp0node.cmd --verify

setlocal EnableDelayedExpansion

if "%1" == "--verify" (
  echo Verify yarn
  exit /b 0
)
call "%~dp0\tools\node-v%NODE_VERSION%-win-x64\node.exe" "%~dp0\tools\node-v%NODE_VERSION%-win-x64\node_modules\corepack\dist\yarn.js" %*

exit /b %ERRORLEVEL%