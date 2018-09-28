const path = require('path');
const fs = require('fs');
const prompt = require('prompt');
const extend = require('extend');
const _ = require('lodash');
const colors = require('colors/safe');
const shell = require('shelljs');
const uniqid = require('uniqid');
const {
  DEFAULT_ADAPTER_CONFIG_FILE,
  CONFIG_PATH_MAP,
  ENV_FILE_MAP,
  DEFAULT_ENV_PATH,
  ADAPTER_PATH_MAP,
  OPTION_ENV_PATH,
  ADAPTER_MAP,
  ADAPTER_NAME_MAP,
  ENVS
} = require('../lib/constants');
const {ymlHelper, envHelper, eval2, mkdirp, envs} = require('../lib/utils');
const platformConfig = path.join(__dirname, 'platform.yml');
const commonConfig = path.join(__dirname, 'common.yml');
const externalConfig = path.join(__dirname, 'external.yml');
const serverConfig = path.join(__dirname, 'server.yml');
const certConfig = path.join(__dirname, 'cert.yml');
const START_UP_COMMAND = `${path.join(__dirname, '..')}/node_modules/.bin/coffee ${path.join(__dirname, '../run.coffee')}`;

async function create(cmd) {
  try {
    let customSchema = {};
    let adapterConfigPath = '';
    let adapterPath = '';
    let adapterName = '';
    let adapterEnvName = '';

    // load common schema
    let platformSchema = configToSchema(platformConfig);
    let commonSchema = configToSchema(commonConfig);
    let externalSchema = configToSchema(externalConfig);
    // load server schema
    let serverSchema = configToSchema(serverConfig);
    // load server schema
    let certSchema = configToSchema(certConfig);
    // get platform
    let platform = await configConsole(platformSchema);
    platform.PLATFORM = Number(platform.PLATFORM);

    // config external adapter if the platform is 5
    if (!ADAPTER_NAME_MAP.has(platform.PLATFORM)) {
      let external = await configConsole(externalSchema);

      if (ADAPTER_MAP.has(external.ADAPTER_NAME)) {
        console.error(`External adapter cannot be named: ${external.ADAPTER_NAME}.`);
        process.exit(1);
      }

      if (!fs.existsSync(external.ADAPTER_PATH)) {
        console.error(`External adapter path: ${external.ADAPTER_PATH} does not exists.`);
        process.exit(1);
      }

      if (!fs.existsSync(`${external.ADAPTER_PATH}/config.yml`)) {
        console.error(`External adapter path: ${external.ADAPTER_PATH}/config.yml does not exists.`);
        process.exit(1);
      }
      adapterName = external.ADAPTER_NAME;
      adapterPath = external.ADAPTER_PATH;
      adapterConfigPath = `${external.ADAPTER_PATH}/config.yml`;
      adapterEnvName = `${external.ADAPTER_NAME}.env`;
    } else { // config internal adapter
      adapterName = ADAPTER_NAME_MAP.get(platform.PLATFORM);
      adapterPath = ADAPTER_PATH_MAP.get(adapterName);
      adapterConfigPath = path.join(CONFIG_PATH_MAP.get(platform.PLATFORM), DEFAULT_ADAPTER_CONFIG_FILE);
      adapterEnvName = ENV_FILE_MAP.get(platform.PLATFORM);
    }

    // load adapter schema
    let adapterSchema = configToSchema(adapterConfigPath);
    // load specified schema if the config file is provided
    if (fs.existsSync(cmd.config)) {
      customSchema = configToSchema(cmd.config);
    }

    // merge all schemas
    let schema = extend(true, {}, customSchema, commonSchema, adapterSchema, serverSchema);
    let adapterEnvFile = `${DEFAULT_ENV_PATH}/${adapterEnvName}`;
    // get the env values if the adapter has been configured before, and set the default value into schema
    if (fs.existsSync(adapterEnvFile)) {
      let preEnvs = envHelper.get(adapterEnvFile);
      _.each(schema.properties, (env, key) => {
        if (preEnvs[key]) {
          env.default = preEnvs[key];
        }
      });
    }

    // schema prompt
    let envVars = await configConsole(schema);
    // cert schema prompt
    let certVars = null;
    // get the env values if the cert file has been configured before, and set the default value into cert schema
    if (fs.existsSync(adapterEnvFile)) {
      let preEnvs = envHelper.get(adapterEnvFile);
      _.each(certSchema.properties, (env, key) => {
        if (preEnvs[key] && (key === 'SBOT_CERT_FILE_PATH' || key === 'SBOT_KEY_FILE_PATH')) {
          env.default = preEnvs[key];
        }
      });
    }
    if (envVars.SBOT_ENABLE_TLS.startsWith('y')) {
      certVars = await configConsole(certSchema);
      if (!fs.existsSync(certVars.SBOT_CERT_FILE_PATH) || !fs.existsSync(certVars.SBOT_KEY_FILE_PATH)) {
        console.error(`Cert file path: '${certVars.SBOT_CERT_FILE_PATH}' or key file path: '${certVars.SBOT_CERT_FILE_PATH}' does not exists.`);
        process.exit(1);
      }
    }
    let optionEnvs = {
      PLATFORM_OPTION: platform.PLATFORM,
      ADAPTER_NAME: adapterName,
      ADAPTER_PATH: adapterPath,
      ADAPTER_ENV_FILE: adapterEnvFile
    };
    let specifiedEnvs = extend(true, {}, envVars, {PLATFORM: platform.PLATFORM}, optionEnvs, certVars);
    // generate all env values
    let allEnvs = generateEnvs(specifiedEnvs);
    // genarate uniqueId for bot
    allEnvs.SBOT_UNIQUE_ID = uniqid();
    // generate or update env file
    envHelper.set(adapterEnvFile, allEnvs);
    // option.env just for 'sbot run'
    envHelper.set(OPTION_ENV_PATH, optionEnvs);

    // mkdir -p all required folders
    mkdirRequiredFolders(allEnvs);

    // exit process if the start option is not provided
    if (!cmd.start) {
      process.exit(1);
    }
    return allEnvs;
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

function run(cmd) {
  let platform = null;
  if (!cmd.platform) {
    if (!fs.existsSync(OPTION_ENV_PATH)) {
      console.error(`The env file ${OPTION_ENV_PATH} was not found.\nPlease run the 'sbot create' or specify the platform, e.g 'sbot run -p wechat'.`);
      console.error('Exiting ...');
      process.exit(1);
    }
    platform = Number(envHelper.get(OPTION_ENV_PATH).PLATFORM_OPTION);
  } else { // specify platform
    if (ADAPTER_MAP.has(cmd.platform)) { // specify supported platform
      platform = ADAPTER_MAP.get(cmd.platform);
    } else { // specify external platform
      console.log(`Platform: ${cmd.platform} not supported.`);
    }
  }

  let adapterEnvFile = ` ${DEFAULT_ENV_PATH}/${cmd.platform}.env`;
  if (platform) {
    adapterEnvFile = `${DEFAULT_ENV_PATH}/${ENV_FILE_MAP.get(platform)}`;
  }
  console.log(`Try to search ${adapterEnvFile} file`);
  if (!fs.existsSync(adapterEnvFile)) {
    console.error(`The env file ${adapterEnvFile} was not found.\nPlease run the 'sbot create' firstly.`);
    console.error('Exiting ...');
    process.exit(1);
  }

  if (cmd.platform) { // if specify platform, reset option.env
    let specifiedEnvs = envHelper.get(adapterEnvFile);
    let optionEnvs = {
      PLATFORM_OPTION: specifiedEnvs.PLATFORM_OPTION,
      ADAPTER_NAME: specifiedEnvs.ADAPTER_NAME,
      ADAPTER_PATH: specifiedEnvs.ADAPTER_PATH,
      ADAPTER_ENV_FILE: specifiedEnvs.ADAPTER_ENV_FILE
    };
    envHelper.set(OPTION_ENV_PATH, optionEnvs);
  }

  if (shell.exec(START_UP_COMMAND).code !== 0) {
    shell.echo('Start bot failed.');
    shell.exit(1);
  }
}

async function createAndRun(cmd) {
  try {
    await create(cmd);
    run(cmd);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

function configConsole(schema) {
  return new Promise((resolve, reject) => {
    prompt.message = colors.cyan('$');
    prompt.delimiter = colors.cyan('>');
    prompt.start();
    prompt.get(schema, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
}
function configToSchema(configFile) {
  let configData = ymlHelper.get(configFile);
  return transformPrompt(configData);
}

function transformPrompt(config) {
  let result = {
    properties: {}
  };
  let defaultPrompt = {
    description: '',
    hidden: false,
    replace: '*',
    required: true
  };
  _.each(config, (item, key) => {
    item.pattern = eval2(item.pattern);
    item.description = colors.cyan(item.description.replace(/\\n/g, '\n'));
    item.message = item.message || `${key} is required.`;
    item.type = 'string';
    result.properties[key] = extend({}, defaultPrompt, item);
  });
  return result;
}

function generateEnvs(envVars) {
  let modeEnvs = {};
  let defaultEnvs = envVars.NODE_ENV === 'production' ? ENVS.PRODUCTION : ENVS.DEVELOPMENT;
  // can be configured in production
  if (envVars.NODE_ENV === 'production') {
    modeEnvs.SBOT_LOG_FILE_TIME = envs('SBOT_LOG_FILE_TIME');
    modeEnvs.SBOT_LOG_LEVEL = envs('SBOT_LOG_LEVEL');
    modeEnvs.SBOT_LOG_LABEL = envs('SBOT_LOG_LABEL');
    modeEnvs.SBOT_LOG_DIR = envs('SBOT_LOG_DIR');
    modeEnvs.SBOT_FILES_DIR = envs('SBOT_FILES_DIR');
    modeEnvs.SBOT_TRAINING_DATA_DIR = envs('SBOT_TRAINING_DATA_DIR');
    modeEnvs.SBOT_PACKAGES_DIR = envs('SBOT_PACKAGES_DIR');
  }
  // can be configured in development and production
  modeEnvs.SBOT_SERVER_BASEURL = envs('SBOT_SERVER_BASEURL') || defaultEnvs.SBOT_SERVER_BASEURL;
  modeEnvs.SBOT_MINIMUM_SIMILARITY = envs('SBOT_MINIMUM_SIMILARITY') || defaultEnvs.SBOT_MINIMUM_SIMILARITY;
  modeEnvs.REMINDER_COMMAND_LIST_MAXIMUM = envs('REMINDER_COMMAND_LIST_MAXIMUM') || defaultEnvs.REMINDER_COMMAND_LIST_MAXIMUM;
  modeEnvs.SBOT_MISSPELLING_ENABLED = envs('SBOT_MISSPELLING_ENABLED') || defaultEnvs.SBOT_MISSPELLING_ENABLED;

  return extend(true, {}, envVars, defaultEnvs, modeEnvs);
}

function mkdirRequiredFolders(allEnvs) {
  mkdirp(allEnvs.SBOT_FILES_DIR);
  mkdirp(allEnvs.SBOT_LOG_DIR);
  mkdirp(allEnvs.SBOT_TRAINING_DATA_DIR);
  mkdirp(allEnvs.SBOT_PACKAGES_DIR);
}

module.exports = {
  createAndRun,
  create,
  run
};