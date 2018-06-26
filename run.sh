#!/bin/bash
set -e

##############################
# set proxy
##############################
set_proxy() {
  echo "Set proxy ..."
  if [ -n "$HTTP_PROXY_ENDPOINT" ]; then
    export http_proxy="$HTTP_PROXY_ENDPOINT"
    export https_proxy="$http_proxy"
  fi
}


##############################
# set configuration
##############################

set_config() {
  echo "Set configuration for ${NODE_ENV} ..."
  if [ "$NODE_ENV" = "production" ]; then
    set_env_for_prod
  elif [ "$NODE_ENV" = "development" ] || [ "$NODE_ENV" = "" ]; then
    set_env_for_dev
  else
    echo "NODE_ENV=$NODE_ENV is not supported."
    echo "Please set to \"development\" or \"production\""
    echo "Exiting bot startup script."
    exit -1
  fi
}

set_env_for_prod() {
  # Set log level to info for production
  export SBOT_ROOT="$PWD"
  export SBOT_ENV_DIR="$SBOT_ROOT"
  export SBOT_LOG_DIR="$SBOT_ROOT/log"
  export SBOT_PACKAGES_DIR="$SBOT_ROOT/packages"

  # Set log level to info for production
  export LOG_LEVEL="info"
}

set_env_for_dev() {
  echo "Running bot in development mode. To run in production set NODE_ENV=production."
  export SBOT_ROOT="$PWD"
  export SBOT_ENV_DIR="$SBOT_ROOT"
  export SBOT_LOG_DIR="$SBOT_ROOT/log"
  export SBOT_PACKAGES_DIR="$SBOT_ROOT/packages"

  # Set log level to debug for development
  export LOG_LEVEL="debug"
}


##############################
# start bot
##############################
start() {
  $SBOT_ROOT/node_modules/.bin/coffee $SBOT_ROOT/run.coffee
}


##############################
# main script
##############################
echo ""
echo "-----------------------------------------------------------"
echo "                   Sbot run script                         "
echo "-----------------------------------------------------------"
set_proxy
set_config
start
