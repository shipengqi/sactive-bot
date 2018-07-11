#!/usr/bin/env bash

PROJECT_ROOT="$PWD"
MARKDOWN_DOCS_DIR="${PROJECT_ROOT}/docs"

node_modules/.bin/jsdoc2md \
  --files "lib/**/*.js" \
  > "${MARKDOWN_DOCS_DIR}/api_docs.md"
