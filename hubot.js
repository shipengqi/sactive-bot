const Path = require('path');
const _ = require('lodash');
const env = require('node-env-file');
const config = require('nconf');
const {
  Sbot,
  createRobotAdapter
} = require('./lib/sbot');
const {
  ADAPTER_NAME_MAP,
  OPTION_ENV_PATH,
  ENV_FILE_MAP,
  DEFAULT_ENV_PATH
} = require('./lib/constants');

process.on('SIGHUP', () => console.error('Received SIGHUP signal from OS, ignoring'));

if (process.platform !== 'win32') {
  process.on('SIGTERM', () => process.exit(0));
}

env(OPTION_ENV_PATH);
let platform = config.get('PLATFORM_OPTION');
let adapterEnvFile = `${DEFAULT_ENV_PATH}/${ENV_FILE_MAP.get(Number(platform))}`;
env(adapterEnvFile);

let adapterName = ADAPTER_NAME_MAP.get(Number(platform));
let botName = config.get('SBOT_NAME') || 'Sbot';
let specifiedScripts = config.get('SBOT_SCRIPTS') || '';
let externalModules = config.get('SBOT_HUBOT_MODULES') || '';
let botAlias = config.get('SBOT_ALIAS') || '/';
let enableHttpd = config.get('SBOT_HUBOT_HTTPD') || true;

function loadBot() {
  let robot = new Sbot(enableHttpd, botName, botAlias);
  // Create an adapter for robot
  let adapter = createRobotAdapter(adapterName, robot);

  // Associate adapter with robot (really bad coupling from Hubot's design)
  robot.loadAdapter(adapter);
  robot.logger.info(`Running hubot version ${robot.version}`);

  robot.adapter.once('connected', () => {
    // Load Default scripts in path
    let srcPath = `${__dirname}/src`;
    robot.load(srcPath);
    let scriptsPath = `${__dirname}/scripts`;
    robot.load(scriptsPath);

    // Load scripts from an additional specified path
    let specifiedScriptsPaths = _.compact(_.split(specifiedScripts, ' '));
    if (_.isEmpty(specifiedScriptsPaths)) {
      specifiedScriptsPaths = [];
    }
    _.each(specifiedScriptsPaths, specifiedPath => {
      let specified = '';
      if (specifiedPath[0] === '/') {
        specified = specifiedPath;
      } else {
        specified = Path.resolve('.', specifiedPath);
      }
      if (specified !== srcPath && specified !== scriptsPath) {
        robot.load(specified);
      }
    });

    // Removed hubot-scripts.json usage since it is deprecated
    // https://github.com/github/hubot-scripts
    let externalModulesPaths = _.compact(_.split(externalModules, ' '));
    if (_.isEmpty(externalModulesPaths)) {
      externalModulesPaths = [];
    }
    if (externalModulesPaths && (externalModulesPaths.length > 0)) {
      robot.loadExternalScripts(externalModulesPaths);
    }
  });
  robot.run();
}

loadBot();
