@echo off

setlocal EnableDelayedExpansion
set FILENAME="%~dp0.nvmrc"
set /p NODE_VERSION=< %FILENAME%
set SHA256HASH=70d87dad2378c63216ff83d5a754c61d2886fc39d32ce0d2ea6de763a22d3780
set DOWNLOAD_URL=https://packages.avensia.com/endpoints/node/content/node-v%NODE_VERSION%-win-x64.zip
set NODE_ARCHIVE=%~dp0tools\node-v%NODE_VERSION%-win-x64.zip
set NODE_INSTALL_DIR=%~dp0tools\node-v%NODE_VERSION%-win-x64\
set NODE=%NODE_INSTALL_DIR%node.exe

if not exist %NODE% (
:download
  echo Downloading Node %NODE_VERSION%...
  for /F %%i in ('curl -s -o %NODE_ARCHIVE%.tmp --connect-timeout 5 -w "%%{http_code}" %DOWNLOAD_URL%') do (
    set STATUS=%%i
  )

  if !STATUS!==200 (
    move %NODE_ARCHIVE%.tmp %NODE_ARCHIVE% >nul
    echo Node downloaded^^!
  ) else (
    echo Error !STATUS!: Could not download Node from %DOWNLOAD_URL%
    echo Make sure you're connected to Avensia VPN
    goto :exit
  )

  for /F %%i in ('certutil -hashfile "%NODE_ARCHIVE%" SHA256 ^| find /i /v "sha" ^| find /i /v "certutil"') do (
    set ACTUALHASH=%%i
  )
  if /i !ACTUALHASH! neq %SHA256HASH% (
    echo Error: Invalid hash for %NODE_ARCHIVE% actual:!ACTUALHASH! expected:%SHA256HASH%
    goto :download
  ) else (
    echo Node archive hash is valid
  )

  :: do not restore progress bar. It slows down progress. see https://github.com/PowerShell/PowerShell/issues/2138
  powershell -Command "$ProgressPreference = 'SilentlyContinue'; Expand-Archive -Force -Path %NODE_ARCHIVE% -DestinationPath %~dp0tools"
  del %NODE_ARCHIVE%
  setlocal
  set "PATH=%NODE_INSTALL_DIR%;%PATH%"
  call %~dp0tools\node-v%NODE_VERSION%-win-x64\corepack enable --install-directory=%~dp0/tools/node-v%NODE_VERSION%-win-x64
  echo Node installed^^!
)

set PATH=%NODE_INSTALL_DIR%;%~dp0;%PATH%
if not "%1" == "--verify" call %NODE% %*


:exit
