const path = require('path');
const prompt = require('prompt');
const extend = require('extend');
const _ = require('lodash');
const colors = require('colors/safe');
const {ymlHelper} = require('../lib/utils');
const commonConfig = path.join(__dirname, 'common.yml');

function create(cmd) {
  let commonConfigData = ymlHelper.get(commonConfig);
  let schema = transformPrompt(commonConfigData);
  configConsole(schema)
    .then(inputs => {
      console.log(inputs);
    })
    .catch(e => {
      console.error(e);
      process.exit();
    });
}

function run(cmd) {
  console.log(cmd.name);
}

function createAndRun(cmd) {
  create(cmd);
  run(cmd);
}

function configConsole(schema) {
  return new Promise((resolve, reject) => {
    prompt.message = '';
    prompt.delimiter = colors.green('>');
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
    console.log(result.properties[key])
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