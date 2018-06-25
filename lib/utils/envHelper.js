const fs = require('fs');
const _ = require('lodash');

class EnvHelper {
  /**
   * get data from .env file.
   *
   * @memberof EnvHelper
   * @param {String} file - absolute path of the env file.
   * @returns {Object} json object.
   */
  static get(file) {
    let result = {};
    let stats = fs.statSync(file);
    if (!stats.isFile()) {
      throw new Error('Illegal operation on a directory.');
    }
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n|\r/)
      .forEach(line => {
        let keyValueArr = line.match(/^\s*([\w.]+)\s*=\s*(.*)?\s*$/);
        if (keyValueArr !== null) {
          let k = keyValueArr[1];
          let v = keyValueArr[2] || '';
          result[k] = v;
        }
      });

    return result;
  }

  /**
   * save or update data into .env file.
   *
   * @memberof EnvHelper
   * @param {String} file - absolute path of the env file.
   * @param {Object} data - json object to write.
   * @returns {Object} json object.
   */
  static set(file, data) {
    let result = {};
    let isExists = true;

    if (_.isEmpty(data)) {
      throw new Error('Data cannot be null or empty.');
    }

    let newData = data;
    let dataBuffer = '';
    if (!fs.existsSync(file)) {
      isExists = false;
    }

    if (isExists) {
      let stats = fs.statSync(file);
      if (!stats.isFile()) {
        throw new Error('Illegal operation on a directory.');
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