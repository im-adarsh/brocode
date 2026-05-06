#!/bin/bash
set -e

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting browser companion..."
npm start
