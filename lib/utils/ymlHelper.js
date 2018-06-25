const yaml = require('node-yaml');
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
    let stats = fs.statSync(file);
    if (!stats.isFile()) {
      throw new Error('Illegal operation on a directory.');
    }
    return yaml.readSync(file, options);
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
      throw new Error('Data cannot be null or empty.');
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
        throw new Error('Illegal operation on a directory.');
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
    return yaml.parse(string, options);
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
    return yaml.dump(json, options);
  }
}

module.exports = YmlHelper;