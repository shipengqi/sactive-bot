const Path = require('path');
const _ = require('lodash');
const env = require('node-env-file');
const config = require('nconf');
console.log("-------------22222222222-----------")
const {
  Sbot,
  createRobotAdapter
} = require('./lib/sbot');
const {envHelper} = require('./lib/utils');
const {OPTION_ENV_PATH, ENV_FILE_MAP, DEFAULT_ENV_PATH} = require('./lib/constants');
console.log("-------------333333333333333-----------")
process.on('SIGHUP', () => console.error('Received SIGHUP signal from OS, ignoring'));

if (process.platform !== 'win32') {
  process.on('SIGTERM', () => process.exit(0));
}

let platform = envHelper.get(OPTION_ENV_PATH).PLATFORM_OPTION;
let adapterEnvFile = `${DEFAULT_ENV_PATH}/${ENV_FILE_MAP.get(Number(platform))}`;
env(adapterEnvFile);

// TODO: common env vars
let adapterName = config.get('HUBOT_ADAPTER');
let botName = config.get('HUBOT_NAME') || 'HubotEnterprise';
let botAlias = config.get('HUBOT_ALIAS') || '/';
let enableHttpd = config.get('HUBOT_HTTPD') || true;
let scriptPaths = config.get('HUBOT_SCRIPTS') || '';
let externalScripts = config.get('HUBOT_NODE_MODULES') || '';

// Convert external script (hubot-*) scripts into an array
externalScripts = _.compact(_.split(externalScripts, ' '));
if (_.isEmpty(externalScripts)) {
  externalScripts = [];
}

scriptPaths = _.compact(_.split(scriptPaths, ' '));
if (_.isEmpty(scriptPaths)) {
  scriptPaths = [];
}

function loadBot() {
  console.log("------------------------")
  let robot = new Sbot(enableHttpd, botName, botAlias);
  // Create an adapter for robot
  let adapter = createRobotAdapter(adapterName, robot);

  // Associate adapter with robot (really bad coupling from Hubot's design)
  robot.loadAdapter(adapter);
  robot.logger.info(`Running hubot version ${robot.version}`);

  robot.adapter.once('connected', () => {
    // Load Hubot scripts in path
    let scriptsPath = `${__dirname}/scripts`;
    robot.load(scriptsPath);

    // Load Hubot scripts from an additional specified path
    for (let path of Array.from(scriptPaths)) {
      let scriptPath = '';
      if (path[0] === '/') {
        scriptPath = path;
      } else {
        scriptPath = Path.resolve('.', path);
      }
      robot.load(scriptPath);
    }

    // Removed hubot-scripts.json usage since it is deprecated
    // https://github.com/github/hubot-scripts
    if (externalScripts && (externalScripts.length > 0)) {
      robot.loadExternalScripts(externalScripts);
    }
  });
  robot.run();
}

loadBot();
