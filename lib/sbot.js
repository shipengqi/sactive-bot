const Robot = require('hubot').Robot;
const {ADAPTER_PATH_MAP} = require('./constants');

// Override loadAdapter to do nothing. We could not override by extending
// in Sbot because the super.loadAdapter() would be called instead.
// Hubot.Robot.prototype.loadAdapter = function(adapter) {
//   this.adapter = adapter;
// };

class Sbot extends Robot {
  constructor(httpd, name, alias) {
    if (!name) {
      name = 'Sbot';
    }
    if (!alias) {
      alias = false;
    }
    super(null, 'adapter-not-defined', httpd, name, alias);
  }

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
    robot.logger.info(msg);
    throw new Error(msg);
  }
};

module.exports = {Sbot, createRobotAdapter};
