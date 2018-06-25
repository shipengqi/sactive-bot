const yaml = require('node-yaml');
const logger = require('winston');
const fs = require('fs');
const _ = require('lodash');

class YmlHelper {
  /**
   * get data from yml file.
   *
   * @memberof YmlHelper
   * @param {String} file - absolute path of the yml file.
   * @param {Object} options.
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
      return yaml.readSync(file, options);
    } catch (e) {
      logger.error(e);
      return {};
    }
  }

  /**
   * save or update data into yml file.
   *
   * @memberof YmlHelper
   * @param {String} file - absolute path of the yml file.
   * @param {Object} data - json object to write.
   * @param {Object} options.
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

      let oldData = YmlHelper.get(file);
      newData = Object.assign({}, oldData, data);
    }

    yaml.writeSync(file, newData, options);
    result = newData;
    return result;
  }

  /**
   * Convert yaml into json.
   *
   * @memberof YmlHelper
   * @param {String} string - yaml string.
   * @param {Object} options.
   * @returns {Object} json object.
   */
  static parse(string, options = {}) {
    try {
      return yaml.parse(string, options);
    } catch (e) {
      logger.error(e);
      return {};
    }
  }

  /**
   * Convert json into yaml.
   *
   * @memberof YmlHelper
   * @param {Object} json - json object.
   * @param {Object} options.
   * @returns {String} yaml string.
   */
  static dump(json, options = {}) {
    try {
      return yaml.dump(json, options);
    } catch (e) {
      logger.error(e);
      return {};
    }
  }
}

module.exports = YmlHelper;