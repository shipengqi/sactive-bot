const path = require('path');
const prompt = require('prompt');
const extend = require('extend');
const _ = require('lodash');
const colors = require('colors/safe');
const {ymlHelper} = require('../lib/utils');
const platformConfig = path.join(__dirname, 'platform.yml');
const commonConfig = path.join(__dirname, 'common.yml');
const adaptersPath = path.join(__dirname, '../lib/adapters');
const CONFIG_MAP = new Map([
  [1, `${adaptersPath}/wechat/config.yml`]
]);
async function create(cmd) {
  let platformConfigData = ymlHelper.get(platformConfig);
  let platformSchema = transformPrompt(platformConfigData);
  let commonConfigData = ymlHelper.get(commonConfig);
  let commonSchema = transformPrompt(commonConfigData);
  let platform = await configConsole(platformSchema);
  let adapterConfigData = ymlHelper.get(CONFIG_MAP.get(Number(platform.PLATFORM)));
  let adapterSchema = transformPrompt(adapterConfigData);
  let schema = extend(true, {}, commonSchema, adapterSchema);
  let envs = await configConsole(schema);
  let allEnvs = extend(true, {}, envs, platform);
  console.log(allEnvs);
}

function run(cmd) {
  console.log(cmd.name);
}

async function createAndRun(cmd) {
  await create(cmd);
  run(cmd);
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

function eval2(string) {
  let Func = Function;
  return new Func('return ' + string)();
}
module.exports = {
  createAndRun,
  create,
  run
};