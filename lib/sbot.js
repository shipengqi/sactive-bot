const Robot = require('hubot').Robot;
const {ADAPTER_PATH_MAP} = require('./constants');

class Sbot extends Robot {
  constructor($$utils, $$logger, $$constants, $$middlewares) {
    let name = $$utils.envs('SBOT_NAME');
    let alias = $$utils.envs('SBOT_ALIAS') || '/';
    let httpd = $$utils.envs('SBOT_HUBOT_HTTPD') || false;
    if (!name) {
      name = 'Sbot';
    }
    if (!alias) {
      alias = false;
    }
    super(null, 'adapter-not-defined', httpd, name, alias);
    if ($$logger) {
      this.logger = $$logger;
    }
    this.utils = $$utils;
    this._constants = $$constants;
    this._middlewares = $$middlewares;
  }
  // Override loadAdapter to do nothing.
  loadAdapter(adapter) {
    this.adapter = adapter;
  }
}

const createRobotAdapter = function(adapterName, robot) {
  let msg;
  let path = '';
  if (!adapterName) {
    msg = `Empty adapter name = ${adapterName}`;
    throw new Error(msg);
  }

  if (!ADAPTER_PATH_MAP.has(adapterName)) {
    path = `hubot-${adapterName}`;
  } else {
    path = ADAPTER_PATH_MAP.get(adapterName);
  }

  try {
    robot.logger.info(`Loading ${adapterName} adapter from ${path}`);
    robot.adapterName = adapterName;
    return require(path).use(robot);
  } catch (e) {
    msg = `Could not load ${adapterName}`;
    robot.logger.info(e);
    throw new Error(msg);
  }
};

module.exports = {Sbot, createRobotAdapter};
