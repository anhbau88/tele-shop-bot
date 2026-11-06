@echo off
chcp 65001 > nul
title Telegram Userbot Quét Khách Hàng Tự Động
cd /d "%~dp0"
python scanner.py
pause
