#!/usr/bin/env bash

set -x

npm run package
code --install-extension ppx-debug-0.50.0.vsix
