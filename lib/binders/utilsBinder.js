const utils = require('../utils');

module.exports = injector => {
  injector.bindInstance('utils', utils);
};