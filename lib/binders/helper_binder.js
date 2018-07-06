const Helper = require('../framework/helper');
const Logger = require('../framework/logger');
const Watcher = require('../framework/watcher');
const NLP = require('../nlp');

module.exports = injector => {
  injector.bindClass('helper', Helper);
  injector.bindClass('logger', Logger);
  injector.bindClass('watcher', Watcher);
  injector.bindClass('watcher', NLP);
};