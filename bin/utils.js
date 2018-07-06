const path = require('path');
const fs = require('fs');
const prompt = require('prompt');
const extend = require('extend');
const _ = require('lodash');
const colors = require('colors/safe');
const shell = require('shelljs');
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
const {ymlHelper, envHelper, eval2, mkdirp} = require('../lib/utils');
const platformConfig = path.join(__dirname, 'platform.yml');
const commonConfig = path.join(__dirname, 'common.yml');
const externalConfig = path.join(__dirname, 'external.yml');
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
    let schema = extend(true, {}, customSchema, commonSchema, adapterSchema);
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
    let envs = await configConsole(schema);
    let specifiedEnvs = extend(true, {}, envs, {PLATFORM: platform.PLATFORM});
    let optionEnvs = {
      PLATFORM_OPTION: platform.PLATFORM,
      ADAPTER_NAME: adapterName,
      ADAPTER_PATH: adapterPath,
      ADAPTER_ENV_FILE: adapterEnvFile
    };
    // generate all env values
    let allEnvs = generateEnvs(specifiedEnvs);
    // generate or update env file
    envHelper.set(adapterEnvFile, allEnvs);
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
  } else {
    if (!ADAPTER_MAP.has(cmd.platform)) {
      console.error(`Platform ${cmd.platform} not supported.`);
      console.error('Exiting ...');
      process.exit(1);
    }
    platform = ADAPTER_MAP.get(cmd.platform);
  }
  let adapterEnvFile = `${DEFAULT_ENV_PATH}/${ENV_FILE_MAP.get(platform)}`;
  if (!fs.existsSync(adapterEnvFile)) {
    console.error(`The env file ${adapterEnvFile} was not found.\nPlease run the 'sbot create' firstly.`);
    console.error('Exiting ...');
    process.exit(1);
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

function generateEnvs(envs) {
  let modeEnvs = {};
  let defaultEnvs = envs.NODE_ENV === 'production' ? ENVS.PRODUCTION : ENVS.DEVELOPMENT;
  if (envs.NODE_ENV === 'production') {
    modeEnvs.SBOT_LOG_FILE_TIME = envs('SBOT_LOG_FILE_TIME');
    modeEnvs.SBOT_LOG_LEVEL = envs('SBOT_LOG_LEVEL');
    modeEnvs.SBOT_LOG_LABEL = envs('SBOT_LOG_LABEL');
    modeEnvs.SBOT_LOG_DIR = envs('SBOT_LOG_DIR');
    modeEnvs.SBOT_TRAINING_DATA_DIR = envs('SBOT_TRAINING_DATA_DIR');
    modeEnvs.SBOT_CERTS_DIR = envs('SBOT_CERTS_DIR');
    modeEnvs.SBOT_PACKAGES_DIR = envs('SBOT_PACKAGES_DIR');
  }

  return extend(true, {}, envs, defaultEnvs, modeEnvs);
}

function mkdirRequiredFolders(envs) {
  mkdirp(envs.SBOT_LOG_DIR);
  mkdirp(envs.SBOT_CERTS_DIR);
  mkdirp(envs.SBOT_TRAINING_DATA_DIR);
  mkdirp(envs.SBOT_PACKAGES_DIR);
}

module.exports = {
  createAndRun,
  create,
  run
};