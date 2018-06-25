const jsf = require('jsonfile');
const logger = require('winston');
const fs = require('fs');
const _ = require('lodash');

class JsonHelper {
  /**
   * get data from json file.
   *
   * @memberof JsonHelper
   * @param {string} file - absolute path of the json file.
   * @param {Object} options: Pass in any fs.readFile options or set reviver for a [JSON reviver](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse).
   * @returns {Object} json object.
   */
  static get(file, options = {}) {
    let result = {};
    try {
      let stats = fs.statSync(file);
      if (!stats.isFile()) {
        logger.error('Illegal operation on a directory.');
        return result;
      }
      return jsf.readFileSync(file, options);
    } catch (e) {
      logger.error(e);
      return {};
    }
  }

  /**
   * save or update data into json file.
   *
   * @memberof JsonHelper
   * @param {string} file - absolute path of the json file.
   * @param {Object} data - json object to write.
   * @param {Object} options: Pass in any fs.writeFile options or set replacer for a [JSON replacer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify). Can also pass in spaces and override EOL string.
   * @returns {Object} json object.
   */
  static set(file, data, options = {}) {
    let writeOptions = {
      spaces: 4,
      EOL: '\r\n'
    };
    let result = {};
    let isExists = true;
    if (_.isEmpty(data)) {
      logger.error('Data cannot be null or empty.');
      return result;
    }

    // if (!_.isPlainObject(data)) {
    //   logger.error("Data must be json object.");
    //   return result;
    // }
    let newData = data;
    if (!fs.existsSync(file)) {
      isExists = false;
    }
    options = _.merge(writeOptions, options);
    if (isExists) {
      let stats = fs.statSync(file);
      if (!stats.isFile()) {
        logger.error('Illegal operation on a directory.');
        return result;
      }

      let oldData = JsonHelper.get(file);
      newData = Object.assign({}, oldData, data);
    }

    jsf.writeFileSync(file, newData, options);
    result = newData;
    return result;
  }
}

module.exports = JsonHelper;