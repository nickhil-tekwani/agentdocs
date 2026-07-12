#!/usr/bin/env bash
set -euo pipefail

npm run agentdocs -- status
npm run agentdocs -- validate
git diff --check
