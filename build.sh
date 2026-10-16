#!/usr/bin/env bash
# Render.com build script for server (installs Puppeteer Chrome)
set -e

npm install

# Download Chromium for Puppeteer
node -e "const puppeteer = require('puppeteer'); puppeteer.executablePath();" || npx puppeteer browsers install chrome
