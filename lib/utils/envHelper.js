const fs = require('fs');
const _ = require('lodash');
const logger = require('winston');
const {} = require('../constants/resCode');

class EnvHelper {
  /**
   * get data from .env file.
   *
   * @memberof EnvHelper
   * @param {string} file - absolute path of the env file.
   * @returns {Object} json object.
   */
  static get(file) {
    let result = {};
    try {
      let stats = fs.statSync(file);
      if (!stats.isFile()) {
        logger.error('Illegal operation on a directory.');
        return result;
      }
      fs.readFileSync(file, 'utf8')
        .split(/\r?\n|\r/)
        .forEach(line => {
          let keyValueArr = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
          if (keyValueArr !== null) {
            let k = keyValueArr[1];
            let v = keyValueArr[2] || '';
            result[k] = v;
          }
        });

      return result;
    } catch (e) {
      logger.error(e);
      return {};
    }
  }

  /**
   * save or update data into .env file.
   *
   * @memberof EnvHelper
   * @param {string} file - absolute path of the env file.
   * @param {Object} data - json object to write.
   * @returns {Object} json object.
   */
  static set(file, data) {
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
    let dataBuffer = '';
    if (!fs.existsSync(file)) {
      isExists = false;
    }

    if (isExists) {
      let stats = fs.statSync(file);
      if (!stats.isFile()) {
        logger.error('Illegal operation on a directory.');
        return result;
      }

      let oldData = EnvHelper.get(file);
      newData = Object.assign({}, oldData, data);
    }

    _.forEach(newData, (value, key) => {
      dataBuffer += `${key}=${value}\n`;
    });
    fs.writeFileSync(file, dataBuffer);
    result = newData;
    return result;
  }
}

module.exports = EnvHelper;