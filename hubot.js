const Path = require('path');
const _ = require('lodash');
const env = require('node-env-file');
const config = require('nconf');
const {
  Sbot,
  createRobotAdapter
} = require('./lib/sbot');
const {envHelper} = require('./lib/utils');
const {ADAPTER_NAME_MAP, OPTION_ENV_PATH, ENV_FILE_MAP, DEFAULT_ENV_PATH} = require('./lib/constants');

process.on('SIGHUP', () => console.error('Received SIGHUP signal from OS, ignoring'));

if (process.platform !== 'win32') {
  process.on('SIGTERM', () => process.exit(0));
}

let platform = envHelper.get(OPTION_ENV_PATH).PLATFORM_OPTION;
let adapterEnvFile = `${DEFAULT_ENV_PATH}/${ENV_FILE_MAP.get(Number(platform))}`;
env(adapterEnvFile);

let adapterName = ADAPTER_NAME_MAP.get(Number(platform));
let botName = config.get('HUBOT_NAME') || 'this.';
let botAlias = config.get('HUBOT_ALIAS') || '/';
let enableHttpd = config.get('HUBOT_HTTPD') || true;

function loadBot() {
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

    // Removed hubot-scripts.json usage since it is deprecated
    // https://github.com/github/hubot-scripts
  });
  robot.run();
}

loadBot();
