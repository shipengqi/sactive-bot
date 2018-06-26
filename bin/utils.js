const path = require('path');
const fs = require('fs');
const prompt = require('prompt');
const extend = require('extend');
const _ = require('lodash');
const colors = require('colors/safe');
const {CONFIG_MAP} = require('../lib/constants');
const {ymlHelper, envHelper, eval2} = require('../lib/utils');
const platformConfig = path.join(__dirname, 'platform.yml');
const commonConfig = path.join(__dirname, 'common.yml');

async function create(cmd) {
  try {
    let platformSchema = configToSchema(platformConfig);
    let commonSchema = configToSchema(commonConfig);
    let platform = await configConsole(platformSchema);
    let adapterSchema = configToSchema(CONFIG_MAP.get(Number(platform.PLATFORM)));
    let schema = extend(true, {}, commonSchema, adapterSchema);
    if (fs.existsSync(`${__dirname}/wechat.env`)) {
      let preEnvs = envHelper.get(`${__dirname}/wechat.env`);
      _.each(schema.properties, (env, key) => {
        if (preEnvs[key]) {
          env.default = preEnvs[key];
        }
      });
    }
    let envs = await configConsole(schema);
    let allEnvs = extend(true, {}, envs, platform);
    envHelper.set(`${__dirname}/wechat.env`, allEnvs);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

function run(cmd) {
  if (_.isString(cmd.name)) {

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