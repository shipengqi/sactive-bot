const Robot = require('hubot').Robot;
const {envs} = require('./utils');

class Sbot extends Robot {
  constructor($$utils, $$logger, $$constants, $$middlewares, $$nlp) {
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
    this.nlp = $$nlp;
  }
  // Override loadAdapter to do nothing.
  loadAdapter(adapter) {
    this.adapter = adapter;
  }
  // Training bot
  train() {
    $$utils.envs('SBOT_HUBOT_HTTPD')
    this.nlp.train();
  }
}

const createRobotAdapter = function(adapterName, robot) {
  let msg;
  let path = '';
  if (!adapterName) {
    msg = `Empty adapter name = ${adapterName}`;
    throw new Error(msg);
  }
  path = envs('ADAPTER_PATH');

  // Removed load third party hubot adapter
  // if (!ADAPTER_PATH_MAP.has(adapterName)) {
  //   path = `hubot-${adapterName}`;
  // }

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
