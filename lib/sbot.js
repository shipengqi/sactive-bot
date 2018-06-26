const Hubot = require('hubot');
const {
  ADAPTER_MAPPINGS,
  ADAPTER_PATH_MAPPINGS
} = require('./const');
const LoginResponse = require('./authentication/login_response');

// Override loadAdapter to do nothing. We could not override by extending
// in EnterpriseRobot because the super.loadAdapter() would be called instead.
Hubot.Robot.prototype.loadAdapter = function(adapter) {
  this.adapter = adapter;
};

class EnterpriseRobot extends Hubot.Robot {
  constructor(httpd, name, alias, logger) {
    if(!name) {
      name = 'Hubot';
    }
    if(!alias) {
      alias = false;
    }
    super(undefined, 'adapter-not-defined', httpd, name, alias);
    if(logger) {
      this.logger = logger;
    }
  }

  createLoginResponse(statusCode, authInfo) {
    return new LoginResponse(statusCode, authInfo);
  }
}

const createRobotAdapter = function(adapterName, robot) {
  let msg;
  if (!this.logger) {
    this.logger = require('winston');
  }
  let path = "";
  if (!adapterName) {
    msg = `Empty adapter name = ${adapterName}`;
    this.logger.error(msg);
    throw new Error(msg);
  }

  if (!ADAPTER_MAPPINGS.has(adapterName)) {
    path = __dirname + `/hubot-${adapterName}`;
  } else {
    path = ADAPTER_PATH_MAPPINGS.get(ADAPTER_MAPPINGS.get(adapterName));
  }

  try {
    this.logger.info(`Loading ${adapterName} adapter from ${path}`);
    robot.adapterName = adapterName;
    return require(path).use(robot);
  }catch(err) {
    msg = `Could not load ${adapterName}`;
    this.logger.info(msg);
    this.logger.debug(err);
    throw new Error(msg);
  }
};

module.exports = {EnterpriseRobot, createRobotAdapter};
