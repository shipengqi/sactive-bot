const Path = require('path');
const _ = require('lodash');
const env = require('node-env-file');
const {createRobotAdapter} = require('./lib/sbot');
const {injector, loadBinders} = require('./lib/binders');
loadBinders();

const {
  ADAPTER_NAME_MAP,
  OPTION_ENV_PATH,
  ENV_FILE_MAP,
  DEFAULT_ENV_PATH
} = injector.getInstance('$$constants');
const {envs} = injector.getInstance('$$utils');

if (process.platform !== 'win32') {
  process.on('SIGTERM', () => process.exit(0));
}
process.on('SIGHUP', () => console.error('Received SIGHUP signal from OS, ignoring'));
process.on('uncaughtException', err => {
  console.error(`Uncaught exception : ${err.message}`);
  console.error(err.stack);
});
process.on('unhandledRejection', (reason, p) => {
  console.error(`Unhandled rejection : ${p}, reason: ${reason}`);
});

env(OPTION_ENV_PATH);
let platform = envs('PLATFORM_OPTION');
let adapterEnvFile = `${DEFAULT_ENV_PATH}/${ENV_FILE_MAP.get(Number(platform))}`;
env(adapterEnvFile);

let adapterName = ADAPTER_NAME_MAP.get(Number(platform));
let specifiedScripts = envs('SBOT_SCRIPTS') || '';
let externalModules = envs('SBOT_HUBOT_MODULES') || '';

function loadBot() {
  let robot = injector.getInstance('$$sbot');
  // Create an adapter for robot
  let adapter = createRobotAdapter(adapterName, robot);

  // Associate adapter with robot (really bad coupling from Hubot's design)
  robot.loadAdapter(adapter);
  robot._middlewares.loadMiddlewares(robot);
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
