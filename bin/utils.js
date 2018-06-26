const path = require('path');
const fs = require('fs');
const prompt = require('prompt');
const extend = require('extend');
const _ = require('lodash');
const colors = require('colors/safe');
const {
  DEFAULT_ADAPTER_CONFIG_FILE,
  CONFIG_PATH_MAP,
  ENV_FILE_MAP,
  DEFAULT_ENV_PATH,
  OPTION_ENV_PATH,
  ADAPTER_MAP
} = require('../lib/constants');
const {ymlHelper, envHelper, eval2} = require('../lib/utils');
const platformConfig = path.join(__dirname, 'platform.yml');
const commonConfig = path.join(__dirname, 'common.yml');

async function create(cmd) {
  try {
    let customSchema = {};
    let platformSchema = configToSchema(platformConfig);
    let commonSchema = configToSchema(commonConfig);
    let platform = await configConsole(platformSchema);
    platform.PLATFORM = Number(platform.PLATFORM);
    let adapterSchema = configToSchema(path.join(CONFIG_PATH_MAP.get(platform.PLATFORM), DEFAULT_ADAPTER_CONFIG_FILE));
    if (fs.existsSync(cmd.config)) {
      customSchema = configToSchema(cmd.config);
    }
    let schema = extend(true, {}, customSchema, commonSchema, adapterSchema);
    let adapterEnvFile = `${DEFAULT_ENV_PATH}/${ENV_FILE_MAP.get(platform.PLATFORM)}`;
    if (fs.existsSync(adapterEnvFile)) {
      let preEnvs = envHelper.get(adapterEnvFile);
      _.each(schema.properties, (env, key) => {
        if (preEnvs[key]) {
          env.default = preEnvs[key];
        }
      });
    }
    let envs = await configConsole(schema);
    let allEnvs = extend(true, {}, envs, platform);
    envHelper.set(adapterEnvFile, allEnvs);
    envHelper.set(OPTION_ENV_PATH, {PLATFORM: platform.PLATFORM});
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

function run(cmd) {
  if (!cmd.platform) {
    let options = envHelper.get(OPTION_ENV_PATH);
    let adapterEnvFile = `${DEFAULT_ENV_PATH}/${ENV_FILE_MAP.get(Number(options.PLATFORM))}`;
    if (!fs.existsSync(adapterEnvFile)) {
      console.error(`The env file ${adapterEnvFile} was not found.\nPlease run the 'sbot create' firstly.`);
      console.error('Exiting ...');
      process.exit(1);
    }
  }
  if (!ADAPTER_MAP.has(cmd.platform)) {
    console.error(`Platform ${cmd.platform} not supported.`);
    console.error('Exiting ...');
    process.exit(1);
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

module.exports = {
  createAndRun,
  create,
  run
};