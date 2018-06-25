const Path = require('path');
const _ = require('lodash');

const env = require('node-env-file');
const fs = require('fs');
const Helper = require('./lib/utils/logger');
const config = require('nconf');
const Help = require('./lib/help/help');

const {
  EnterpriseRobot,
  createRobotAdapter
} = require('./lib/hubot_enterprise');
const {
  mattermostValidate,
  slackValidate,
  msTeamsValidate,
  optionValidate
} = require('./lib/utils/validation');
const {
  clearLog
} = require('./lib/utils/logger');
const {
  checkPortStatus
} = require('portscanner');
const {
  MonitorServer
} = require('./lib/monitoring/server');
const watcher = require('./lib/utils/watcher');
const {ACTION_SESSION_MAP} = require('./lib/chatops_chatbot_cache');
const logger = Helper.getLogger(config);

let cdfFlag = process.env.ENV_TYPE;
let adapterEnv = process.env.CHAT_PLATFORM_OPTION;

if (!(cdfFlag === 'kubernetes')) {
  let optionEnvFile = ENV_FILE_TYPE.OPTION;
  if (!fs.existsSync(optionEnvFile)) {
    logger.error(`The configuration file ${optionEnvFile} was not found.\nPlease run the ${process.env.HUBOT_ENTERPRISE_ROOT}/configure.sh to configure your bot.`);
    logger.error('Exiting...');
    process.exit(1);
  }

  // TODO: cast env vars to their appropriate types
  // TODO: add some validation
  env(optionEnvFile);
  optionValidate();
  adapterEnv = process.env.CHAT_PLATFORM_OPTION;

  let adapterEnvFile = `${process.env.HUBOT_ENTERPRISE_ENV_DIR}/${adapterEnv}.env`;
  if (!fs.existsSync(adapterEnvFile)) {
    logger.error(`The configuration file ${adapterEnvFile} was not found.\nPlease run the ${process.env.HUBOT_ENTERPRISE_ROOT}/configure.sh to configure your bot.`);
    logger.error('Exiting...');
    process.exit(1);
  }

  env(adapterEnvFile);
} else {
  optionValidate();
}

const adapterEnvMapping = new Map([
  ['slack', slackValidate],
  ['mattermost', mattermostValidate],
  ['msteams', msTeamsValidate]
]);

if (!ADAPTER_MAPPINGS.has(adapterEnv)) {
  logger.error(`Chat platform ${adapterEnv} not supported`);
  process.exit(1);
}

let adapterName = ADAPTER_MAPPINGS.get(adapterEnv);
adapterEnvMapping.get(adapterName)();

process.on('SIGHUP', () => logger.error('Received SIGHUP signal from OS, ignoring'));

if (process.platform !== 'win32') {
  process.on('SIGTERM', () => process.exit(0));
}

// TODO: common env vars
adapterName = config.get('HUBOT_ADAPTER');
let botName = config.get('HUBOT_NAME') || 'HubotEnterprise';
let botAlias = config.get('HUBOT_ALIAS') || '/';
let enableHttpd = config.get('HUBOT_HTTPD') || true;
let scriptPaths = config.get('HUBOT_SCRIPTS') || '';
let externalScripts = config.get('HUBOT_NODE_MODULES') || '';

// TODO: unified server env vars
let unifiedServerPort = config.get('HUBOT_UNIFIED_SERVER_PORT') || PORT.DEFAULT_PORT;
let privateKeyPath = config.get('PRIVATE_KEY_PATH') || CERT.DEFAULT_PRIVATE_KEY_PATH;
let certificatePath = config.get('CERTIFICATE_PATH') || CERT.DEFAULT_CERTIFICATE_PATH;
let restApiUsername = config.get('HUBOT_REST_API_USERNAME');
let restApiPassword = config.get('HUBOT_REST_API_PASSWORD');

// TODO: slack env vars
let slackClientId = config.get('HUBOT_SLACK_APP_CLIENT_ID');
let slackSecret = config.get('HUBOT_SLACK_APP_SECRET');
let slackTeamName = config.get('HUBOT_SLACK_APP_TEAM_NAME');
let slackTeamUsername = config.get('HUBOT_SLACK_APP_TEAM_USERNAME');
let slackTeamUserPassword = config.get('HUBOT_SLACK_APP_TEAM_USERPASS');
let slackApiToken = config.get('HUBOT_SLACK_API_TOKEN');
let slackBotToken = config.get('HUBOT_SLACK_TOKEN');
let slackServerHostname = config.get('HUBOT_SLACK_OAUTH2_WEBSERVER_HOSTNAME');
let slackServerPort = config.get('HUBOT_SLACK_OAUTH2_WEBSERVER_PORT');

// Convert external script (hubot-*) scripts into an array
externalScripts = _.compact(_.split(externalScripts, ' '));
if (_.isEmpty(externalScripts)) {
  externalScripts = [];
}

// Convert external script (hubot-*) scripts into an array
scriptPaths = _.compact(_.split(scriptPaths, ' '));
if (_.isEmpty(scriptPaths)) {
  scriptPaths = [];
}

function loadBot() {
  // Create robot
  let robot = new EnterpriseRobot(enableHttpd, botName, botAlias, logger);

  let help = new Help(robot);
  let unifiedConfig = {
    unifiedServerPort,
    privateKeyPath,
    certificatePath,
    restApiUsername,
    restApiPassword
  };
  hubotServer.run(unifiedConfig, keys => {
    robot.unifiedKeys = keys;

    // Start monitoring server
    if ((config.get('HUBOT_ENTERPRISE_ENABLE_MONITORING') === 'true') ||
      (config.get('HUBOT_ENTERPRISE_ENABLE_MONITORING') === '1')) {
      logger.info('Enabled monitoring');
      new MonitorServer(robot).start()
        .then(() => logger.info('Successfully started monitor server.'))
        .catch(e => logger.error(e));
    }

    // Create an adapter for robot
    let adapter = createRobotAdapter(adapterName, robot);

    // Associate adapter with robot (really bad coupling from Hubot's design)
    robot.loadAdapter(adapter);

    logger.info(`Running hubot version ${robot.version}`);

    // Trigger actions upon adapter connection (emit)
    robot.adapter.once('connected', () => {
      // Load Hubot Enterprise before everything else
      let srcPath = `${__dirname}/src`;
      robot.load(srcPath);

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
        if ((scriptPath === srcPath) || (scriptPath === scriptsPath)) {
          logger.info(` Script path: ${scriptPath} has loaded.`);
        } else {
          robot.load(scriptPath);
        }
      }

      // Removed hubot-scripts.json usage since it is deprecated
      // https://github.com/github/hubot-scripts
      if (externalScripts && (externalScripts.length > 0)) {
        robot.loadExternalScripts(externalScripts);
      }

      if (cdfFlag !== 'kubernetes') {
        help.greetUser(robot.e.registrar);
      }

      // Watch the content pack directory
      watcher.getInstance(robot);

      setSimpleInstallDisabled(ADAPTER_MAPPINGS.get(adapterName).toUpperCase());
    });

    // Run robot, which runs the adapter also
    robot.run();
  });
}

function setSimpleInstallDisabled(platform) {
  let simpleBuffer;
  let platformSimpleInstall = platform + '_SIMPLE_INSTALL';
  if (!fs.existsSync(ENV_FILE_TYPE.SIMPLE_INSTALL)) {
    simpleBuffer = `${platformSimpleInstall}=${ENV_FILE_TYPE.SIMPLE_INSTALL_DISABLED}\n`;
    logger.info(`Saving ${platformSimpleInstall} in ${ENV_FILE_TYPE.SIMPLE_INSTALL}.`);
    fs.writeFileSync(ENV_FILE_TYPE.SIMPLE_INSTALL, simpleBuffer);
  } else {
    simpleBuffer = (fs.readFileSync(ENV_FILE_TYPE.SIMPLE_INSTALL)).toString();
    if (simpleBuffer.indexOf(platformSimpleInstall) === - 1) {
      simpleBuffer = `${simpleBuffer}${platformSimpleInstall}=${ENV_FILE_TYPE.SIMPLE_INSTALL_DISABLED}\n`;
    }
    logger.info(`Saving ${platformSimpleInstall} in ${ENV_FILE_TYPE.SIMPLE_INSTALL}.`);
    fs.writeFileSync(ENV_FILE_TYPE.SIMPLE_INSTALL, simpleBuffer);
  }
}

function loadSlackBot() {
  if (slackApiToken && slackBotToken) {
    // Option A: for injecting existing bot and api tokens directly
    process.env.HUBOT_SLACK_TOKEN = slackBotToken;
    process.env.HUBOT_SLACK_API_TOKEN = slackApiToken;
    loadBot();
  } else {
    let cache = new SlackAuth.TokenCache(`${process.env.HUBOT_ENTERPRISE_ENV_DIR}/config/slack-app.json`);
    cache.getTokens(botName).then(tokens => {
      // Found tokens in cache
      if (tokens.botToken) {
        process.env.HUBOT_SLACK_TOKEN = tokens.botToken;
      }

      if (tokens.apiToken) {
        process.env.HUBOT_SLACK_API_TOKEN = tokens.apiToken;
      }
      return loadBot();
    }).catch(() =>
      // No tokens in cache.
      // Option B: generating bot and api tokens via oauth flow with local web server
      // Check the port chosen to ensure that it is open.
      checkPortStatus(slackServerPort, {timeout: DELAY_TIME})
        .then(status => {
          if (status === 'open') {
            // Port is not open, exit.
            logger.error(`The port ${slackServerPort} is occupied, you can use another port with running the configure.sh!`);
            process.exit(1);
          }

          // Port is open, create server.
          let server = new SlackAuth.WebServer(slackServerHostname, slackServerPort, slackClientId, slackSecret, botName,
            slackTeamName, slackTeamUsername, slackTeamUserPassword);

          // Run auth flow
          return server.run();
        }).then(tokens => {
        // Everything went well, inject tokens for adapter
          if (tokens.botToken) {
            process.env.HUBOT_SLACK_TOKEN = tokens.botToken;
          }

          if (tokens.apiToken) {
            process.env.HUBOT_SLACK_API_TOKEN = tokens.apiToken;
          }
          // Save the tokens in cache for later re-use.
          cache.saveTokens(botName, tokens);
        }).then(() => {
        // Load the bot
          loadBot();
          Promise.resolve(true);
        }).catch(e => {
        // Something went wrong with the oauth flow, exit.
          logger.error('An error occurred retrieving slack app tokens. ' +
          'Exiting...'
          );
          logger.debug(e);
          process.exit(1);
        })
    );
  }
}

// TODO: are we going to keep supporting non-unified adapters?
const adapterFunctionMapping = new Map([
  ['slack', loadSlackBot],
  ['mattermost', loadBot],
  ['msteams', loadBot]
]);

adapterFunctionMapping.get(ADAPTER_MAPPINGS.get(adapterName))();

class EnterpriseRobot extends Hubot.Robot {
  constructor(httpd, name, alias, logger) {
    if (!name) {
      name = 'Hubot';
    }
    if (!alias) {
      alias = false;
    }
    super(undefined, 'adapter-not-defined', httpd, name, alias);
    if (logger) {
      this.logger = logger;
    }
  }

  createLoginResponse(statusCode, authInfo) {
    return new LoginResponse(statusCode, authInfo);
  }
}
