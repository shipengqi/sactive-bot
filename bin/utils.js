const path = require('path');
const prompt = require('prompt');
const colors = require('colors/safe');
const {ymlHelper} = require('../lib/utils');
const commonConfig = path.join(__dirname, '..', 'common.yml');

function create(cmd) {
  console.log(cmd.config);
  console.log(cmd.start);
  let commonData = ymlHelper.get(commonConfig);
  console.log(commonData);
  configConsole({properties: commonData});
}

function run(cmd) {
  console.log(cmd.name);
}

function createAndRun(cmd) {
  create(cmd);
  run(cmd);
}

function configConsole(schema) {
  return new Promise(resolve => {
    prompt.message = colors.green(">");
    prompt.delimiter = colors.green(">");
    prompt.start();
    prompt.get(schema, (err, result) => {
      if (err) {
        console.log(err);
      }
      console.log(result);
    });
  });
}

module.exports = {
  createAndRun,
  create,
  run
};