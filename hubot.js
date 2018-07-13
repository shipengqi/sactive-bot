const Path = require('path');
const _ = require('lodash');
const env = require('node-env-file');
const {createRobotAdapter} = require('./lib/sbot');
const botServer = require('./lib/api');
const {injector, loadBinders} = require('./lib/binders');
loadBinders();

const {OPTION_ENV_PATH} = injector.getInstance('$$constants');
const {envs} = injector.getInstance('$$utils');

if (process.platform !== 'win32') {
  process.on('SIGTERM', () => process.exit(0));
}
// ignore SIGHUP signal
process.on('SIGHUP', () => console.error('Received SIGHUP signal from OS, ignoring'));
// uncaught exception handle
process.on('uncaughtException', err => {
  console.error(`Uncaught exception:`);
  console.error(err);
});
// unhandled rejection
process.on('unhandledRejection', (reason, p) => {
  console.error(`Unhandled rejection: `);
  console.log(p);
});

env(OPTION_ENV_PATH);
let adapterEnvFile = envs('ADAPTER_ENV_FILE');
env(adapterEnvFile);

let proxy = envs('HTTP_PROXY_ENDPOINT');
if (proxy) {
  process.env.http_proxy = process.env.HTTP_PROXY = proxy;
  if (!process.env.HTTPS_PROXY && !process.env.https_proxy) {
    process.env.https_proxy = process.env.HTTPS_PROXY = proxy;
  }
}

let adapterName = envs('ADAPTER_NAME');
let specifiedScripts = envs('SBOT_SCRIPTS') || '';
let externalModules = envs('SBOT_HUBOT_MODULES') || '';

function loadBot() {
  let robot = injector.getInstance('$$sbot');
  // bind nlp module
  robot.nlp = injector.getInstance('$$nlp');
  // Warning in development
  if (envs('NODE_ENV') !== 'production') {
    robot.logger.warn('Running bot in development mode. To run in production set NODE_ENV=production.');
  }
  // Create an adapter for robot
  let adapter = createRobotAdapter(adapterName, robot);

  // Associate adapter with robot (really bad coupling from Hubot's design)
  robot.loadAdapter(adapter);
  robot._middlewares.loadMiddlewares(robot);
  robot.logger.info(`Running hubot version ${robot.version}`);

  // start bot server
  robot.sbotApp = botServer.use(robot);
  // load scripts after connected
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

  try {
    robot.run();
  } catch (e) {
    robot.logger.error(`Running with error: ${e.message}`);
    robot.logger.debug(e);
  }
}

loadBot();
