#!/bin/bash
echo "Installing dependencies..."
if ! npm i; then
  echo "npm install failed."
  exit 1
fi
echo "Browserifying modules...";
if ! ./node_modules/browserify/bin/cmd.js ./node_modules/node-rsa/src/NodeRSA.js -o webui/NodeRSA.js -s NodeRSA; then
  echo "browserify failed."
  exit 1
fi
if ! ./node_modules/browserify/bin/cmd.js ./node_modules/crypto-js/crypto-js.js -o webui/crypto-js.js -s CryptoJS; then
  echo "browserify failed."
  exit 1
fi
echo "Starting network..."
if ! docker-compose -p blockchain up -d --build > /dev/null; then
  echo "Failed to start containers. Check if docker is installed and running."
  exit 1
fi
echo "Starting client..."
node server.js clientcfg.json