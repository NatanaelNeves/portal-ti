#!/bin/sh
# Startup script - installs dependencies then starts the app
cd /home/site/wwwroot
npm install --production
node dist/index.js
