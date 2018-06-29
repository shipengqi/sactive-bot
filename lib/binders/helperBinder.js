const Helper = require('../framework/helper');
const Logger = require('../framework/logger');
const Watcher = require('../framework/watcher');

module.exports = injector => {
  injector.bindClass('helper', Helper);
  injector.bindClass('logger', Logger);
  injector.bindClass('watcher', Watcher);
};