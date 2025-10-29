@echo off
cd /d "%~dp0"
call npx capacitor-assets generate --android
echo Icons have been stored
pause

