#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$(dirname "$DIR")/engine"

if ! node-gyp build; then
  echo "Build failed. Trying configure and build"
  node-gyp configure || exit 1
  node-gyp build || exit 1
fi