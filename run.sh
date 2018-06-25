#!/bin/bash
set -e

##############################
# Set node env
##############################

set_node_env() {
  echo "Set Node env ..."

  CONFIG_PATH=`dirname $0`

  if [ "$CONFIG_PATH" = "." ]; then
    CONFIG_PATH=$PWD
  fi

  PACKAGE_NAME=${CONFIG_PATH##*/}

  if [ -f /etc/opt/microfocus/$PACKAGE_NAME/option.env ]; then
    source /etc/opt/microfocus/$PACKAGE_NAME/option.env
    export NODE_ENV="$NODE_ENV"
  elif [ -f $PWD/option.env ]; then
    source $PWD/option.env
    export NODE_ENV="development"
  fi

  echo "CHAT_PLATFORM_OPTION: $CHAT_PLATFORM_OPTION"
}

##############################
# set proxy
##############################
set_proxy() {
  echo "Set proxy ..."
  if [ -n "$HTTP_PROXY_ENDPOINT" ]; then
    export http_proxy="$HTTP_PROXY_ENDPOINT"
    export https_proxy="$http_proxy"
    echo $http_proxy
  fi
}

##############################
# set npm proxy - if exists in env
##############################
set_npm_proxy() {
  echo "Set npm proxy ..."
  if [ -n "$http_proxy" ]; then
    npm config set proxy ${http_proxy}
    npm config set https-proxy ${http_proxy}
  elif [ -n "$HTTP_PROXY" ]; then
    npm config set proxy ${HTTP_PROXY}
    npm config set https-proxy ${HTTP_PROXY}
  fi

  if [ -n "$https_proxy" ]; then
    npm config set https-proxy ${https_proxy}
  elif [ -n "$HTTPS_PROXY" ]; then
    npm config set https-proxy ${HTTPS_PROXY}
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
set_node_env
set_proxy
set_npm_proxy
set_config
start
